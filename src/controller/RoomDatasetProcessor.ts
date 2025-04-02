import Room from "./Room";
import JSZip from "jszip";
import { InsightError } from "./IInsightFacade";
import { request } from "http";

const MAX_DEPTH = 15;

function findValidTableByClassName(node: any, className: string, depth: number): any {
	if (depth > MAX_DEPTH) {
		return null;
	}

	if (node.childNodes !== null && node.childNodes !== undefined) {
		for (let i = 0; i < node.childNodes?.length; i++) {
			const child = node.childNodes[i];
			if (child.tagName === "td" && child.attrs[0].value === className) {
				return child.parentNode.parentNode;
			}
			const result: any = findValidTableByClassName(node.childNodes[i], className, depth + 1);
			if (result) return result;
		}
	}
	return null;
}

function getValueInCell(row: any, index: any): any {
	if (row.childNodes !== null && row.childNodes !== undefined && index < row.childNodes.length) {
		const valueCell = row.childNodes[index];

		if (valueCell.childNodes[0] !== null && valueCell.childNodes[0] !== undefined) {
			const textCell = valueCell.childNodes[0];
			return textCell.value.trim();
		}
	}
	return null;
}

function getValueInLinkCell(row: any, index: any): any {
	if (row.childNodes !== null && row.childNodes !== undefined && index < row.childNodes.length) {
		const valueCell = row.childNodes[index];

		if (valueCell.childNodes[1] !== null && valueCell.childNodes[1] !== undefined) {
			const linkCell = valueCell.childNodes[1];
			if (linkCell.childNodes[0] !== null && linkCell.childNodes[0] !== undefined) {
				const textCell = linkCell.childNodes[0];
				return textCell.value.trim();
			}
		}
	}
	return null;
}

function getLinkValue(row: any, index: any): any {
	if (row.childNodes !== null && row.childNodes !== undefined && index < row.childNodes.length) {
		const valueCell = row.childNodes[index];

		if (valueCell.childNodes[1] !== null && valueCell.childNodes[1] !== undefined) {
			const linkCell = valueCell.childNodes[1];
			if (linkCell.attrs[0]) {
				return linkCell.attrs[0].value;
			}
		}
	}
	return null;
}

function findIndexOfClass(row: any, className: string): number | null {
	if (row.childNodes !== null && row.childNodes !== undefined) {
		for (let i = 0; i < row.childNodes?.length; i++) {
			const cell = row.childNodes[i];
			if (cell.tagName === "td" && cell.attrs[0].value === className) {
				return i;
			}
		}
	}
	return null;
}

function createRooms(rows: any[], fullName: string, shortName: string, addr: string, location: any): any[] {
	const rooms: any[] = [];
	const roomNumIndex = findIndexOfClass(rows[1], "views-field views-field-field-room-number");
	const roomSeatsIndex = findIndexOfClass(rows[1], "views-field views-field-field-room-capacity");
	const roomTypeIndex = findIndexOfClass(rows[1], "views-field views-field-field-room-type");
	const roomFurnIndex = findIndexOfClass(rows[1], "views-field views-field-field-room-furniture");

	if (roomNumIndex === null || roomSeatsIndex === null || roomTypeIndex === null || roomFurnIndex === null) {
		return [];
	}

	for (const row of rows) {
		if (row.tagName === "tr") {
			const roomNum: string = getValueInLinkCell(row, roomNumIndex);
			const seats: string = getValueInCell(row, roomSeatsIndex);
			const type: string = getValueInCell(row, roomTypeIndex);
			const furniture: string = getValueInCell(row, roomFurnIndex);
			const href: string = getLinkValue(row, roomNumIndex);

			if (roomNum === null || seats === null || type === null || furniture === null || href === null) continue;

			const room = new Room(
				fullName,
				shortName,
				roomNum,
				addr,
				location.lat,
				location.lon,
				+seats,
				type,
				furniture,
				href
			);
			rooms.push(room);
		}
	}
	return rooms;
}

export default class RoomDatasetProcessor {
	public async getZipObject(content: string): Promise<any> {
		return await JSZip.loadAsync(content, { base64: true });
	}

	public async HTMLtoTree(zip: JSZip, filePath: string): Promise<any> {
		const parse5 = require("parse5");
		const data = await zip.file(filePath)?.async("string");

		if (data) {
			return parse5.parse(data);
		} else {
			throw new InsightError("error reading zip file");
		}
	}

	public getBuildingsInfo(document: any): string[][] {
		const buildings: any[] = [];
		const table = findValidTableByClassName(document, "views-field views-field-field-building-address", 0);

		if (table === null) {
			throw new InsightError("No valid table in index.htm");
		}

		const rows: any[] = [];
		const children = table.childNodes;
		for (const child of children) {
			if (child.tagName === "tr") {
				rows.push(child);
			}
		}

		const fullNameIndex = findIndexOfClass(rows[0], "views-field views-field-title");
		const shortNameIndex = findIndexOfClass(rows[0], "views-field views-field-field-building-code");
		const addrIndex = findIndexOfClass(rows[0], "views-field views-field-field-building-address");

		if (fullNameIndex === null || shortNameIndex === null || addrIndex === null) {
			throw new InsightError("Table in index.htm missing required fields");
		}

		for (const row of rows) {
			const building: any[] = [];
			building.push(getValueInCell(row, shortNameIndex));
			building.push(getValueInLinkCell(row, fullNameIndex));
			building.push(getValueInCell(row, addrIndex));
			building.push(getLinkValue(row, fullNameIndex).slice(2));

			buildings.push(building);
		}

		return buildings;
	}

	public processBuilding(shortName: string, fullName: string, addr: string, roomDoc: any, location: any): Room[] {
		const table = findValidTableByClassName(roomDoc, "views-field views-field-field-room-number", 0);
		if (table === null) {
			return [];
		}

		const rows = table.childNodes;
		return createRooms(rows, fullName, shortName, addr, location);
	}

	public async getGeolocation(address: string): Promise<{ lat: number; lon: number } | null> {
		return new Promise((resolve, reject) => {
			const baseUrl = `http://cs310.students.cs.ubc.ca:11316/api/v1/project_team245`;
			const encodedAddress = encodeURIComponent(address);
			const url = `${baseUrl}/${encodedAddress}`;
			const okStatus = 200;

			const req = request(url, (res) => {
				let data = "";

				if (res.statusCode !== okStatus) {
					reject(new InsightError("Failed to retrieve geolocation"));
					return;
				}

				res.on("data", (chunk) => {
					data += chunk;
				});

				res.on("end", () => {
					try {
						const jsonData = JSON.parse(data);
						resolve({ lat: jsonData.lat, lon: jsonData.lon });
					} catch {
						reject(new InsightError("Failed to parse geolocation response"));
					}
				});
			});

			req.on("error", (error) => {
				reject(new InsightError("Failed to fetch geolocation"));
			});

			req.end();
		});
	}
}
