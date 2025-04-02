import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError,
} from "./IInsightFacade";
import CourseDatasetProcessor from "./CourseDatasetProcessor";
import Section from "./Section";
import { ensureFile, pathExists, remove, writeJSON } from "fs-extra";
import Dataset from "./Dataset";
import QueryEngine from "./QueryEngine";
import JSZip from "jszip";
import Room from "./Room";
import RoomDatasetProcessor from "./RoomDatasetProcessor";

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */

// saves sections to disk as json file in ./data directory
async function writeDatasetToDisk(id: string, kind: InsightDatasetKind, totalData: Array<any>): Promise<void> {
	try {
		const datasetFile = id + "_dataset.json";
		if (kind === InsightDatasetKind.Rooms) {
			await ensureFile("./data/rooms/" + datasetFile);
			await writeJSON("./data/rooms/" + datasetFile, totalData);
		} else {
			await ensureFile("./data/sections/" + datasetFile);
			await writeJSON("./data/sections/" + datasetFile, totalData);
		}
	} catch {
		throw new InsightError("error writing dataset to disk");
	}
}

async function handleRooms(content: string): Promise<Room[]> {
	const dp = new RoomDatasetProcessor();
	const zip: JSZip = await dp.getZipObject(content);
	const doc: any = await dp.HTMLtoTree(zip, "index.htm");
	// const doc: any = await dp.processCampusZip(content);
	const docPromises: any[] = [];
	const locationPromises: any[] = [];

	const buildingsInfo = dp.getBuildingsInfo(doc);
	for (const building of buildingsInfo) {
		try {
			docPromises.push(dp.HTMLtoTree(zip, building[3]));
			locationPromises.push(dp.getGeolocation(building[2]));
		} catch {
			// ignore building and continue
		}
	}

	const buildingDocs = await Promise.allSettled(docPromises);
	const locations = await Promise.allSettled(locationPromises);
	let rooms: Room[] = [];

	for (let i = 0; i < buildingsInfo.length; i++) {
		if (buildingDocs[i].status === "fulfilled" && locations[i].status === "fulfilled") {
			const currBuilding = buildingsInfo[i];
			const shortName: string = currBuilding[0];
			const fullName: string = currBuilding[1];
			const addr: string = currBuilding[2];

			const location: any = locations[i];
			const buildingDoc: any = buildingDocs[i];

			rooms = rooms.concat(dp.processBuilding(shortName, fullName, addr, buildingDoc.value, location.value));
		} else {
			throw new InsightError("failed to load building");
		}
	}
	return rooms;
}

async function handleCourses(content: string): Promise<Section[]> {
	const dp = new CourseDatasetProcessor();
	const coursesArray: string[] = await dp.processCourses(content);
	let totalSections: Section[] = [];

	for (const courseStr of coursesArray) {
		if (dp.courseIsValid(courseStr)) {
			totalSections = totalSections.concat(dp.courseToSections(courseStr));
		}
	}
	return totalSections;
}

function checkValidID(id: string, kind: InsightDatasetKind, facade: InsightFacade): boolean {
	const currDatasets = Array.from(facade.datasetMap.keys());

	if (id === "" || id === " " || id.includes("_") || currDatasets.includes(id)) {
		throw new InsightError("invalid dataset id");
	}

	return true;
}

async function checkDiskForRooms(datasetMap: Map<string, Array<any>>, datasetList: Dataset[]): Promise<void> {
	const fs = require("fs-extra");
	if (datasetList.length > 0) {
		return;
	}
	try {
		const roomsExist = await fs.pathExists("./data/rooms");

		if (roomsExist) {
			const roomFiles = await fs.readdir("./data/rooms");
			if (roomFiles.length === 0) {
				return;
			}
			await Promise.all(
				roomFiles.map(async (file: any) => {
					const filePath = `./data/rooms/${file}`;
					const fileContent = await fs.readJson(filePath);
					const datasetId = file.replace("_dataset.json", "");
					datasetMap.set(datasetId, fileContent);
					datasetList.push(new Dataset(datasetId, InsightDatasetKind.Rooms, fileContent.length));
				})
			);
		}
		return;
	} catch {
		return;
	}
}

async function checkDiskForSections(datasetMap: Map<string, Array<any>>, datasetList: Dataset[]): Promise<void> {
	const fs = require("fs-extra");
	if (datasetList.length > 0) {
		return;
	}
	try {
		const sectionsExist = await fs.pathExists("./data/sections");

		if (sectionsExist) {
			const sectionFiles = await fs.readdir("./data/sections");
			if (sectionFiles.length === 0) {
				return;
			}
			await Promise.all(
				sectionFiles.map(async (file: any) => {
					const filePath = `./data/sections/${file}`;
					const fileContent = await fs.readJson(filePath);
					const datasetId = file.replace("_dataset.json", "");
					datasetMap.set(datasetId, fileContent);
					datasetList.push(new Dataset(datasetId, InsightDatasetKind.Sections, fileContent.length));
				})
			);
		}
		return;
	} catch {
		return;
	}
}

export default class InsightFacade implements IInsightFacade {
	public datasetMap: Map<string, Array<any>> = new Map<string, Array<any>>();
	public datasetList: Array<Dataset> = new Array<Dataset>();

	public async addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {
		const dp = new CourseDatasetProcessor();
		checkValidID(id, kind, this);

		if (dp.isBase64(content)) {
			try {
				let data: any[];
				if (kind === InsightDatasetKind.Rooms) {
					data = await handleRooms(content);
				} else {
					data = await handleCourses(content);
				}

				if (data.length !== 0) {
					this.datasetMap.set(id, data);
					const dataset = new Dataset(id, kind, data.length);
					this.datasetList.push(dataset);
					await writeDatasetToDisk(id, kind, data);
				} else {
					throw new InsightError("no valid sections or rooms");
				}
			} catch (err: any) {
				throw new InsightError(err.toString());
			}
		} else {
			throw new InsightError("content is not a valid base64 string");
		}

		return Array.from(this.datasetMap.keys());
	}

	public async removeDataset(id: string): Promise<string> {
		await checkDiskForSections(this.datasetMap, this.datasetList);
		await checkDiskForRooms(this.datasetMap, this.datasetList);

		const datasetFile = id + "_dataset.json";

		if (id === "" || id === " " || id.includes("_")) {
			throw new InsightError("invalid dataset id");
		}

		this.datasetMap.delete(id);
		let index = -1;
		for (let i = 0; i < this.datasetList.length; i++) {
			if (this.datasetList[i].id === id) {
				index = i;
				break;
			}
		}

		if (index !== -1) {
			this.datasetList.splice(index, 1);
		}

		if (await pathExists("./data/sections/" + datasetFile)) {
			await remove("./data/sections/" + datasetFile);
		} else if (await pathExists("./data/rooms/" + datasetFile)) {
			await remove("./data/rooms/" + datasetFile);
		} else {
			throw new NotFoundError("dataset not yet added");
		}

		return id;
	}

	public async performQuery(query: unknown): Promise<InsightResult[]> {
		await checkDiskForSections(this.datasetMap, this.datasetList);
		await checkDiskForRooms(this.datasetMap, this.datasetList);

		const queryEngine: QueryEngine = new QueryEngine(query, this.datasetMap);
		queryEngine.validateQuery(query);

		const results: InsightResult[] = queryEngine.processQuery();

		const maxResults = 5000;
		if (results.length > maxResults) {
			return Promise.reject(new ResultTooLargeError("Too many results"));
		}

		return results;
	}

	public async listDatasets(): Promise<InsightDataset[]> {
		await checkDiskForSections(this.datasetMap, this.datasetList);
		await checkDiskForRooms(this.datasetMap, this.datasetList);
		return this.datasetList;
	}
}
