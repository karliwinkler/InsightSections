import RoomDatasetProcessor from "../../src/controller/RoomDatasetProcessor";
import { clearDisk, getContentFromArchives } from "../TestUtil";
import Room from "../../src/controller/Room";
import { expect } from "chai";
import JSZip from "jszip";
import { InsightError } from "../../src/controller/IInsightFacade";

describe("DatasetProcessor", function () {
	let dp: RoomDatasetProcessor;
	let campus: string;

	before(async function () {
		dp = new RoomDatasetProcessor();
		campus = await getContentFromArchives("campus.zip");

		await clearDisk();
	});

	describe("getBuildingsInfo", function () {
		it("successful test", async function () {
			const zip: JSZip = await dp.getZipObject(campus);
			const doc: any = await dp.HTMLtoTree(zip, "index.htm");
			const buildingsInfo = dp.getBuildingsInfo(doc);

			expect(buildingsInfo[0][0]).to.equal("ACU");
			expect(buildingsInfo[0][1]).to.equal("Acute Care Unit");
			expect(buildingsInfo[0][2]).to.equal("2211 Wesbrook Mall");
			expect(buildingsInfo[0][3]).to.equal("campus/discover/buildings-and-classrooms/ACU.htm");

			expect(buildingsInfo[1][0]).to.equal("ALRD");
			expect(buildingsInfo[1][1]).to.equal("Allard Hall (LAW)");
			expect(buildingsInfo[1][2]).to.equal("1822 East Mall");
			expect(buildingsInfo[1][3]).to.equal("campus/discover/buildings-and-classrooms/ALRD.htm");
		});
	});

	describe("processBuilding", function () {
		it("successful test", async function () {
			const zip: JSZip = await dp.getZipObject(campus);
			const doc: any = await dp.HTMLtoTree(zip, "campus/discover/buildings-and-classrooms/ALRD.htm");
			const location: any = await dp.getGeolocation("1822 East Mall");
			const rooms: Room[] = dp.processBuilding("ALRD", "Allard Hall (LAW)", "1822 East Mall", doc, location);

			expect(rooms[0].getShortName()).to.equal("ALRD");
			expect(rooms[0].getFullName()).to.equal("Allard Hall (LAW)");
			expect(rooms[0].getNumber()).to.equal("105");
			expect(rooms[0].getAddr()).to.equal("1822 East Mall");
			// expect(rooms[0].getSeats()).to.equal(94);
			expect(rooms[0].getType()).to.equal("Case Style");
			expect(rooms[0].getFurniture()).to.equal("Classroom-Fixed Tables/Movable Chairs");
			expect(rooms[0].getLink()).to.equal(
				"http://students.ubc.ca/campus/discover/buildings-and-classrooms/room/ALRD-105"
			);
			expect(rooms[0].getLat()).to.equal(location.lat);
			expect(rooms[0].getLon()).to.equal(location.lon);
		});
	});

	describe("HTMLtoTree", function () {
		it("invalid file path", async function () {
			try {
				const zip: JSZip = await dp.getZipObject(campus);
				await dp.HTMLtoTree(zip, "campus/discover/ALRD.htm");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});
	});

	describe("getGeolocation", function () {
		it("successful test", async function () {
			let result = await dp.getGeolocation("6245 Agronomy Road V6T 1Z4");
			expect(result).to.deep.equal({ lat: 49.26125, lon: -123.24807 });

			result = await dp.getGeolocation("1822 East Mall");
			expect(result).to.deep.equal({ lat: 49.2699, lon: -123.25318 });
		});

		it("invalid address", async function () {
			try {
				await dp.getGeolocation(" ");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});
	});
});
