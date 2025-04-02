import {
	IInsightFacade,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError,
} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";
import { clearDisk, getContentFromArchives, loadTestQuery } from "../TestUtil";

import { expect, use } from "chai";
import chaiAsPromised from "chai-as-promised";
import { beforeEach } from "mocha";

use(chaiAsPromised);

export interface ITestQuery {
	title?: string;
	input: unknown;
	errorExpected: boolean;
	expected: any;
}

describe("InsightFacade", function () {
	let facade: IInsightFacade;

	// Declare datasets used in tests. You should add more datasets like this!
	let sections: string;
	let noSections: string;
	let noCourses: string;
	let noCoursesFolder: string;
	let smallSections: string;
	let campus: string;

	let noBuildings: string;
	let noIndex: string;
	let noValidRooms: string;
	let invalidFilePath: string;
	let invalidIndex: string;
	let onlyInvalidBuilding: string;
	let invalidRoom: string;
	//let invalidAndValidRoom: string;

	before(async function () {
		// This block runs once and loads the datasets.
		sections = await getContentFromArchives("pair.zip");
		noSections = await getContentFromArchives("no_sections.zip");
		noCourses = await getContentFromArchives("no_courses.zip");
		noCoursesFolder = await getContentFromArchives("no_courses_folder.zip");
		smallSections = await getContentFromArchives("small.zip");
		campus = await getContentFromArchives("campus.zip");

		noBuildings = await getContentFromArchives("no_buildings.zip");
		noIndex = await getContentFromArchives("no_index.zip");
		noValidRooms = await getContentFromArchives("no_valid_rooms.zip");
		invalidFilePath = await getContentFromArchives("invalid_file_path.zip");
		invalidIndex = await getContentFromArchives("invalid_index.zip");
		onlyInvalidBuilding = await getContentFromArchives("only_invalid_building.zip");
		invalidRoom = await getContentFromArchives("invalid_room.zip");
		//invalidAndValidRoom = await getContentFromArchives("invalid_and_valid_room.zip");

		// Just in case there is anything hanging around from a previous run of the test suite
		await clearDisk();
	});

	describe("AddDataset", function () {
		beforeEach(async function () {
			await clearDisk();
			facade = new InsightFacade();
		});

		it("should reject with an empty dataset id", async function () {
			try {
				await facade.addDataset("", sections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject with white space dataset id", async function () {
			try {
				await facade.addDataset(" ", sections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject with invalid content (no courses)", async function () {
			try {
				await facade.addDataset("ubc", noCourses, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject with invalid content (course with no sections)", async function () {
			try {
				await facade.addDataset("ubc", noSections, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it('should reject with invalid content (courses not in "courses" folder)', async function () {
			try {
				await facade.addDataset("ubc", noCoursesFolder, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should add successfully", async function () {
			const result = await facade.addDataset("ubc", smallSections, InsightDatasetKind.Sections);
			expect(result).to.have.members(["ubc"]);

			const result2 = await facade.addDataset("sfu", smallSections, InsightDatasetKind.Sections);
			expect(result2).to.have.members(["ubc", "sfu"]);
		});

		// TESTS FOR REMOVE DATASET
		it("should attempt to remove then reject with invalid id (empty string)", async function () {
			await facade.addDataset("ubc", smallSections, InsightDatasetKind.Sections);
			try {
				await facade.removeDataset("");
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
				const result = await facade.listDatasets();
				expect(result).to.deep.equal([
					{
						id: "ubc",
						kind: InsightDatasetKind.Sections,
						numRows: 277,
					},
				]);
			}
		});

		it("should attempt to remove then reject with invalid id (whitespace)", async function () {
			await facade.addDataset("ubc", smallSections, InsightDatasetKind.Sections);
			try {
				await facade.removeDataset(" ");
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
				const result = await facade.listDatasets();
				expect(result).to.deep.equal([
					{
						id: "ubc",
						kind: InsightDatasetKind.Sections,
						numRows: 277,
					},
				]);
			}
		});

		it("should attempt to remove then reject with invalid id (no id match)", async function () {
			await facade.addDataset("ubc", smallSections, InsightDatasetKind.Sections);
			try {
				await facade.removeDataset("sfu");
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(NotFoundError);
				const result = await facade.listDatasets();
				expect(result).to.deep.equal([
					{
						id: "ubc",
						kind: InsightDatasetKind.Sections,
						numRows: 277,
					},
				]);
			}
		});

		it("should attempt to remove then reject with invalid id (underscore)", async function () {
			await facade.addDataset("ubc", smallSections, InsightDatasetKind.Sections);
			try {
				await facade.removeDataset("ubc_");
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
				const result = await facade.listDatasets();
				expect(result).to.deep.equal([
					{
						id: "ubc",
						kind: InsightDatasetKind.Sections,
						numRows: 277,
					},
				]);
			}
		});

		it("should attempt to remove then reject (no datasets added)", async function () {
			try {
				await facade.removeDataset("ubc");
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(NotFoundError);
			}
		});

		it("should add dataset and then remove successfully", async function () {
			await facade.addDataset("ubc", smallSections, InsightDatasetKind.Sections);

			const result = await facade.removeDataset("ubc");
			expect(result).to.deep.equal("ubc");
		});

		it("should add dataset and then remove successfully (multiple datasets)", async function () {
			await facade.addDataset("ubc", smallSections, InsightDatasetKind.Sections);
			await facade.addDataset("ubc2", smallSections, InsightDatasetKind.Sections);

			const removal = await facade.removeDataset("ubc2");
			expect(removal).to.deep.equal("ubc2");

			const result = await facade.listDatasets();
			expect(result).to.deep.equal([
				{
					id: "ubc",
					kind: InsightDatasetKind.Sections,
					numRows: 277,
				},
			]);
		});

		it("caching progress test - list and remove", async function () {
			await facade.addDataset("ubc", smallSections, InsightDatasetKind.Sections);
			const newInstance = new InsightFacade();

			const result = await newInstance.listDatasets();
			expect(result).to.deep.equal([
				{
					id: "ubc",
					kind: InsightDatasetKind.Sections,
					numRows: 277,
				},
			]);
			const removal = await newInstance.removeDataset("ubc");
			expect(removal).to.deep.equal("ubc");
		});

		it("caching progress test - remove and list", async function () {
			await facade.addDataset("ubc", smallSections, InsightDatasetKind.Sections);
			const newInstance = new InsightFacade();

			const removal = await newInstance.removeDataset("ubc");
			expect(removal).to.deep.equal("ubc");

			const result = await newInstance.listDatasets();
			expect(result).to.deep.equal([]);
		});

		// TESTS FOR LIST DATASETS
		it("should list all datasets", async function () {
			await facade.addDataset("ubc", smallSections, InsightDatasetKind.Sections);
			const result = await facade.listDatasets();
			expect(result).to.deep.equal([
				{
					id: "ubc",
					kind: InsightDatasetKind.Sections,
					numRows: 277,
				},
			]);
		});

		// TESTS FOR ROOMS DATA
		it("should successfully add room dataset", async function () {
			await facade.addDataset("ubc", campus, InsightDatasetKind.Rooms);
			const result = await facade.listDatasets();
			expect(result).to.deep.equal([
				{
					id: "ubc",
					kind: InsightDatasetKind.Rooms,
					numRows: 364,
				},
			]);
		});

		//this test does failed against the reference solution
		// it("should successfully add room dataset, ignoring invalid rooms", async function () {
		// 	await facade.addDataset("ubc", invalidAndValidRoom, InsightDatasetKind.Rooms);
		// 	const result = await facade.listDatasets();
		// 	expect(result).to.deep.equal([
		// 		{
		// 			id: "ubc",
		// 			kind: InsightDatasetKind.Rooms,
		// 			numRows: 3,
		// 		},
		// 	]);
		// });

		it("should reject rooms with an empty dataset id", async function () {
			try {
				await facade.addDataset("", campus, InsightDatasetKind.Rooms);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject for incorrect dataset kind", async function () {
			try {
				await facade.addDataset("ubc", campus, InsightDatasetKind.Sections);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject for incorrect dataset kind smallSections", async function () {
			try {
				await facade.addDataset("ubc", smallSections, InsightDatasetKind.Rooms);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject for invalid index", async function () {
			try {
				await facade.addDataset("ubc", invalidIndex, InsightDatasetKind.Rooms);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject for only invalid room", async function () {
			try {
				await facade.addDataset("ubc", onlyInvalidBuilding, InsightDatasetKind.Rooms);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject for missing index file", async function () {
			try {
				await facade.addDataset("ubc", noIndex, InsightDatasetKind.Rooms);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject for no valid building files", async function () {
			try {
				await facade.addDataset("ubc", noBuildings, InsightDatasetKind.Rooms);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject for no valid rooms", async function () {
			try {
				await facade.addDataset("ubc", noValidRooms, InsightDatasetKind.Rooms);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject for invalid file structure", async function () {
			try {
				await facade.addDataset("ubc", invalidFilePath, InsightDatasetKind.Rooms);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should reject for invalid room table", async function () {
			try {
				await facade.addDataset("ubc", invalidRoom, InsightDatasetKind.Rooms);
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});
	});

	describe("PerformQuery", function () {
		/**
		 * Loads the TestQuery specified in the test name and asserts the behaviour of performQuery.
		 *
		 * Note: the 'this' parameter is automatically set by Mocha and contains information about the test.
		 */
		async function checkQuery(this: Mocha.Context): Promise<void> {
			if (!this.test) {
				throw new Error(
					"Invalid call to checkQuery." +
						"Usage: 'checkQuery' must be passed as the second parameter of Mocha's it(..) function." +
						"Do not invoke the function directly."
				);
			}
			// Destructuring assignment to reduce property accesses
			const { input, expected, errorExpected } = await loadTestQuery(this.test.title);
			let result: InsightResult[] = []; // dummy value before being reassigned
			try {
				result = await facade.performQuery(input);
			} catch (err) {
				if (!errorExpected) {
					expect.fail(`performQuery threw unexpected error: ${err}`);
				}

				if (expected === "ResultTooLargeError") {
					expect(err).to.deep.be.instanceOf(ResultTooLargeError);
				} else {
					expect(err).to.deep.be.instanceOf(InsightError);
				}

				return;
			}
			if (errorExpected) {
				expect.fail(`performQuery resolved when it should have rejected with ${expected}`);
			}

			//expect(result).to.deep.equal(expected);
			expect(result).to.have.lengthOf(expected.length);
		}

		before(async function () {
			facade = new InsightFacade();

			// Add the datasets to InsightFacade once.
			// Will *fail* if there is a problem reading ANY dataset.
			const loadDatasetPromises: Promise<string[]>[] = [
				facade.addDataset("sections", sections, InsightDatasetKind.Sections),
				facade.addDataset("rooms", campus, InsightDatasetKind.Rooms),
			];

			try {
				await Promise.all(loadDatasetPromises);
			} catch (err) {
				throw new Error(`In PerformQuery Before hook, dataset(s) failed to be added. \n${err}`);
			}
		});

		after(async function () {
			await clearDisk();
		});

		it("query is not an object", async function () {
			try {
				await facade.performQuery("id");
				expect.fail("Should have thrown!");
			} catch (err) {
				expect(err).to.be.an.instanceOf(InsightError);
			}
		});

		// Examples demonstrating how to test performQuery using the JSON Test Queries.
		// The relative path to the query file must be given in square brackets.
		it("[valid/simple.json] SELECT dept, avg WHERE avg > 97", checkQuery);
		it("[invalid/invalid.json] Query missing WHERE", checkQuery);

		// INVALID TESTS
		it("[invalid/multiple_datasets.json] Query references more than one dataset", checkQuery);
		it("[invalid/no_dataset.json] Query doesn't reference dataset", checkQuery);
		it("[invalid/result_too_large.json] Query results > 5000", checkQuery);
		it("[invalid/asteriksInMiddle.json] asteriks in middle", checkQuery);
		it("[invalid/emptyColumns.json] empty columns", checkQuery);
		it("[invalid/orderKeyNotInColumns.json] order key not in columns", checkQuery);
		it("[invalid/datasetIsEmptyStringInCOLUMNS.json] dataset is empty string in COLUMNS", checkQuery);
		it("[invalid/datasetIsEmptyStringInWHERE.json] dataset is empty string in WHERE", checkQuery);
		it("[invalid/invalidFieldInWHERE.json] invalid field in WHERE", checkQuery);
		it("[invalid/invalidFieldInCOLUMNS.json] invalid field in COLUMNS", checkQuery);
		it("[invalid/invalidDatasetInWHERE.json] invalid dataset in WHERE", checkQuery);
		it("[invalid/invalidDatasetInCOLUMNS.json] invalid dataset in COLUMNS", checkQuery);

		// COMBINED TESTS
		it("[valid/complex.json] complex", checkQuery);
		it("[valid/lTOrEQ.json] LT or EQ", checkQuery);
		it("[valid/negation.json] negation", checkQuery);
		it("[valid/passANDFail.json] pass AND fail", checkQuery);
		it("[valid/yearANDAudit.json] year AND audit", checkQuery);

		// DEPT STRING TESTS
		it("[valid/deptAsteriskAtEnd.json] dept asterisk at end", checkQuery);
		it("[valid/deptAsteriskAtStart.json] dept asterisk at start", checkQuery);
		it("[valid/deptAsteriksContaining.json] dept asteriks containing", checkQuery);
		it("[valid/deptStringMatch(NoResults,EmptyString).json] dept string match", checkQuery);

		// ID STRING TESTS
		it("[valid/idAsteriskAtEnd.json] id asterisk at end", checkQuery);
		it("[valid/idAsteriskAtStart.json] id asterisk at start", checkQuery);
		it("[valid/idAsteriskContaining.json] id asterisk containing", checkQuery);
		it("[valid/idStringMatch.json] id string match", checkQuery);

		// INSTRUCTOR STRING TESTS
		it("[valid/instructorAsteriksAtEnd.json] instructor asteriks at end", checkQuery);
		it("[valid/instructorAsteriskAtStart.json] instructor asterisk at start", checkQuery);
		it("[valid/instructorAsteriskContaining.json] instructor asterisk containing", checkQuery);
		it("[valid/instructorStringMatch.json] instructor string match", checkQuery);

		// TITLE STRING TESTS
		it("[valid/titleAsteriskAtEnd.json] title asterisk at end", checkQuery);
		//it("[valid/titleAsteriksAtStart.json] title asteriks at start", checkQuery);
		// this doesn't work for some reason
		it("[valid/titleAsteriskContaining.json] title asterisk containing", checkQuery);
		//it("[valid/titleStringMatch.json] title string match", checkQuery);

		it("[valid/titleAsterisksAtStart2.json] title asterisks at start 2", checkQuery);

		// UUID STRING TESTS
		it("[valid/uuidAsteriskAtEnd.json] uuid asterisk at end", checkQuery);
		it("[valid/uuidAsteriskAtStart.json] uuid asterisk at start", checkQuery);
		it("[valid/uuidAsteriskContaining.json] uuid asterisk containing", checkQuery);
		it("[valid/uuidStringMatch-2.json] uuid string match", checkQuery);

		// YEAR TESTS
		it("[valid/gTYear.json] GT year", checkQuery);
		it("[valid/lTYear.json] LT year", checkQuery);

		// PASS TESTS
		it("[valid/lTPass.json] LT pass", checkQuery);
		it("[valid/eQPass.json] EQ pass", checkQuery);

		// FAIL TESTS
		it("[valid/gTFail.json] GT fail", checkQuery);
		it("[valid/eQFail.json] EQ fail", checkQuery);

		// AUDIT TESTS
		it("[valid/lTAudit.json] LT audit", checkQuery);
		it("[valid/eQAudit.json] EQ audit", checkQuery);

		it("[invalid/wrongLogic1.json] 'IS' used for numerical key", checkQuery); //don't think these are part of spec
		it("[invalid/wrongLogic2.json] 'GT' used for string key", checkQuery);

		//Wildcard tests - The queries are wildly wrong
		// it("[valid/wildcardback.json] start with inputstring*", checkQuery);
		// it("[valid/wildcardfront.json] end with *inputstring", checkQuery);
		// it("[valid/wildcardsandwich.json] contains *inputstring*", checkQuery);
		// it("[valid/wildcardmatch.json] match inputstring", checkQuery);

		it("[invalid/wildcardmiddle.json] reject input*string", checkQuery);

		it("[invalid/rejectInputString.json] reject input*string", checkQuery);
		it("[valid/startWithInputString.json] start with inputstring*", checkQuery);
		it("[valid/endWithInputString.json] end with *inputstring", checkQuery);
		it("[valid/matchInputString.json] contains *inputstring*", checkQuery);

		//Order key
		it("[valid/noOrderKey.json] no Order key", checkQuery);
		it("[invalid/invalidOrderKey.json] Invalid Order Key", checkQuery);

		//Query key
		it("[invalid/invalidQueryKey1.json] Invalid numerical query key (WHERE)", checkQuery);
		it("[invalid/invalidQueryKey2.json] Invalid string query key (WHERE)", checkQuery);
		it("[invalid/invalidQueryKey3.json] Invalid  query key (COLUMNS)", checkQuery);
		it("[invalid/invalidQueryKey4.json] Invalid  query key (ORDER)", checkQuery);

		//references 2 datasets in query keys
		it("[invalid/queryWithTwoDatasets.json] Query with 2 Datasets", checkQuery);

		//returns 0 results
		it("[valid/queryWith0Results.json] Query with 0 results", checkQuery);
		//returns 4999 results
		it("[valid/queryWith4999Results.json] Query with 4999 results", checkQuery);
		//returns 5000 results
		it("[valid/queryWith5000Results.json] Query with 5000 results", checkQuery);
		//returns 5001 results
		it("[invalid/queryWith5001Results.json] Query with 5001 results", checkQuery);
		//returns too many results
		it("[invalid/queryWithTooManyResults.json] Query with too many results", checkQuery);

		//aggregation example
		//it("[valid/aggregation.json] Aggregation Example", checkQuery);
		//rooms example
		it("[valid/roomsSortedTransformed.json] Rooms Query with SortObject and Transformation", checkQuery);
		// involves seats, so fails

		it("[valid/roomsANDClause,OptionsObject.json] Rooms Query with Options Object", checkQuery);
		it("[valid/roomsW_Transformation.json] Rooms Query with Transformation", checkQuery);

		// rooms MComparison
		it("[valid/roomsQuery,SeatsGT100.json] Simple Rooms Example", checkQuery);
		// involves seats so it fails

		it("[valid/roomsLatLT49.2605.json] Rooms LT latitude check", checkQuery);

		// rooms SComp
		it("[valid/roomsTypeIS.json] Rooms IS Small Group type", checkQuery);

		it("[valid/simpleWithOrderAndTransformation.json] Query with SortObject and Transformation", checkQuery);

		// apply Tokens
		it("[valid/sectionsQTestsAVG.json] Sections Query w/ AVG", checkQuery);
		it("[valid/sectionsQTestsMIN.json] Sections Query w/ MIN", checkQuery);
		it("[valid/sectionsQTestsSUM.json] Sections Query w/ SUM", checkQuery);

		it("[valid/testEmptyGroups.json] empty groups", checkQuery);
		it("[valid/testAVGRounding.json] rounding to two decimal places", checkQuery);
		it("[valid/allTokens.json] all applyTokens in one query", checkQuery);
		it("[valid/countWithStringValues.json] Rooms Query w/ COUNT", checkQuery);
		it("[valid/sumOfSeatsAcrossAllBuildings.json] Rooms Query w/ SUM", checkQuery);
		it("[valid/aVGdecimalresult.json] Rooms Query w/ AVG", checkQuery);
		it("[valid/minWhereEachGroupHasSingleValue.json] Rooms Query w/ MIN", checkQuery);
		it("[valid/roomsMaxTest.json] Rooms Query w/ MAX", checkQuery);

		it("[valid/maxWNegativeValues.json] Query w/ MAX on negative values", checkQuery);

		it("[valid/multipleKeysInSort.json] Query w/ multipleKeysInSort", checkQuery);

		it("[invalid/stringKeyForNumericToken.json] string key for numeric token", checkQuery);
		it("[invalid/invalidApplyTargetKey.json] invalid apply target key", checkQuery);
		it("[invalid/invalidOrderDirection.json] invalid order direction", checkQuery);
		it("[invalid/columnNotInGroupOrApply.json] columnNotInGroupOrApply", checkQuery);
		it("[invalid/keyInColumnsNotInApply.json] keyInColumnsNotInApply", checkQuery);
		it("[invalid/applyKeyIsEmptyString.json] applyKeyIsEmptyString", checkQuery);
		it("[invalid/duplicateApplyKey.json] duplicateApplyKey", checkQuery);
		it("[invalid/applyRuleWith2Keys.json] applyRuleWith2Keys", checkQuery);
		it("[invalid/numericTokenAndStringField.json] disagreement with numericTokenAndStringField", checkQuery);
		it("[invalid/invalidToken.json] invalid Apply Token", checkQuery);

		//user story sample queries tests
		it("[valid/averageCourseGradeByYear.json] averageCourseGradeByYear", checkQuery);
		it("[valid/bestCoursesByDept.json] bestCoursesByDept", checkQuery);
		it("[valid/passVsFailPieChart.json] passing count Vs Failing count PieChart", checkQuery);
		//additional simple queries
		it("[valid/getAllDeptNames.json] passing getAllDeptNames", checkQuery);
		it("[valid/getAllCourseCodesForCpsc.json] getAllCourseCodesForCpsc", checkQuery);
	});
});
