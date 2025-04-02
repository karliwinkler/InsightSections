import { expect } from "chai";
import QueryValidator from "../../src/controller/QueryValidator";
import { InsightError } from "../../src/controller/IInsightFacade";

describe("QueryValidator", function () {
	let qv: QueryValidator;
	const query1 = {
		WHERE: {
			GT: {
				sections_avg: 97,
			},
		},
		OPTIONS: {
			COLUMNS: ["sections_dept", "sections_avg"],
			ORDER: "sections_avg",
		},
	};

	before(async function () {
		qv = new QueryValidator(query1);
	});

	// set extractDatasetID to public to test
	describe("extractDatasetID", function () {
		it("should return 'sections' as datasetID", async function () {
			//const result = qv.extractDatasetId(query1);
			// expect(result).to.equal("sections");
		});
	});

	// set to public to test
	describe("validateOptions", function () {
		it("should not throw error for valid options", async function () {
			qv.validateOptions({
				COLUMNS: ["sections_dept", "sections_avg"],
				ORDER: "sections_avg",
			});
		});

		it("should not throw error for missing ORDER", async function () {
			qv.validateOptions({
				COLUMNS: ["sections_title", "sections_instructor", "sections_dept", "sections_year"],
			});
		});

		it("should throw error for invalid field", async function () {
			try {
				qv.validateOptions({
					COLUMNS: ["sections_id_"],
				});
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});

		it("should throw error for order key not in columns", async function () {
			try {
				qv.validateOptions({
					COLUMNS: ["sections_dept"],
					ORDER: "sections_avg",
				});
			} catch (err) {
				expect(err).to.be.instanceOf(InsightError);
			}
		});
	});

	// describe("validateWhere", function () {
	// 	it("should not throw error for valid where", async function () {
	// 		qv.validateWhere({
	// 			GT: {
	// 				sections_avg: 97,
	// 			},
	// 		});
	// 	});
	//
	// 	it("should throw error for invalid dataset", async function () {
	// 		try {
	// 			qv.validateWhere({
	// 				IS: {
	// 					smallSections_dept: "ad*",
	// 				},
	// 			});
	// 		} catch (err) {
	// 			expect(err).to.be.instanceOf(InsightError);
	// 		}
	// 	});
	// });
});
