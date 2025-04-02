// import {
// 	InsightDatasetKind,
// 	InsightError,
// 	ResultTooLargeError,
// } from "../../src/controller/IInsightFacade";
//
// import {expect, use} from "chai";
// import chaiAsPromised from "chai-as-promised";
// import {beforeEach} from "mocha";
//
// import QueryEngine from "../../src/controller/QueryEngine";
// import Dataset from "../../src/controller/Dataset";
//
// use(chaiAsPromised);

// //TEST SUITE IS BROKEN :(

// describe("QueryEngine", function () {
// 	let queryEngine: QueryEngine;
//
// 	beforeEach(function () {
//
// 		queryEngine = new QueryEngine({
// 			"OPTIONS": {
// 				"COLUMNS": ["sections_dept", "sections_avg"]
// 			}
// 		}, new Dataset("placeholder", InsightDatasetKind.Sections, 10));
// 	});
//
// 	describe("check Query Validation", function () {
// 		it("should reject because missing WHERE", function () {
// 			const query = {
// 				"OPTIONS": {
// 					"COLUMNS": ["sections_dept", "sections_avg"]
// 				}
// 			};
//
// 			// This line of code was heavily inspired by code from an AI chatbot.
// 			// It was prompted to "provide a quick way to test if an error is thrown using chai"
// 			// and gave:   "expect(faultyFunction).to.throw('Something went wrong!');"
// 			// Most tests in this test suite use a similar line of code that was inspired by AI generated code.
// 			expect(() => queryEngine.validateQuery(query)).to.throw(InsightError);
// 		});
//
// 		it("should reject because missing OPTIONS", function () {
// 			const query = {
// 				"WHERE": {}
// 			};
// 			expect(() => queryEngine.validateQuery(query)).to.throw(InsightError);
// 		});
//
// 		it("should reject b/c empty COLUMNS", function () {
// 			const query = {
// 				"WHERE": {},
// 				"OPTIONS": {
// 					"COLUMNS": []
// 				}
// 			};
// 			expect(() => queryEngine.validateQuery(query)).to.throw(InsightError);
// 		});
//
// 		it("should reject b/c invalid comparison", function () {
// 			const query = {
// 				"WHERE": {
// 					"AAA": { sections_avg: 22 }
// 				},
// 				"OPTIONS": {
// 					"COLUMNS": ["sections_dept", "sections_avg"]
// 				}
// 			};
// 			expect(() => queryEngine.validateQuery(query)).to.throw(InsightError);
// 		});
// 	});
//
// 	describe("Numeric Comparisons", function () {
// 		it("filters sections GT", function () {
// 			const query = {
// 				"WHERE": {
// 					"GT": { sections_avg: 80 }
// 				},
// 				"OPTIONS": {
// 					"COLUMNS": ["sections_dept", "sections_avg"]
// 				}
// 			};
// 			const result = queryEngine.processQuery(query);
// 			expect(result).to.have.lengthOf(1);
// 		});
//
// 		it("filters sections LT", function () {
// 			const query = {
// 				"WHERE": {
// 					"LT": { sections_avg: 80 }
// 				},
// 				"OPTIONS": {
// 					"COLUMNS": ["sections_dept", "sections_avg"]
// 				}
// 			};
// 			const result = queryEngine.processQuery(query);
// 			expect(result).to.have.lengthOf(1);
// 		});
// 	});
//
// 	describe("String Comparisons", function () {
// 		it("should handle exact string match", function () {
// 			const query = {
// 				"WHERE": {
// 					"IS": { sections_instructor: "Alice" }
// 				},
// 				 "OPTIONS": {
// 					"COLUMNS": ["sections_instructor", "sections_avg"]
// 				}
// 			};
// 			const result = queryEngine.processQuery(query);
// 			expect(result).to.have.lengthOf(1);
// 		});
//
// 		it("should handle wildcard prefix", function () {
// 			const query = {
// 				"WHERE": {
// 					"IS": { sections_title: "*Structures" }
// 				},
// 				"OPTIONS": {
// 					"COLUMNS": ["sections_title"]
// 				}
// 			};
// 			const result = queryEngine.processQuery(query);
// 			expect(result).to.have.lengthOf(1);
// 		});
// 	});
//
// 	describe("Logical Combinations", function () {
// 		it("should handle AND combination", function () {
// 			const query = {
// 				"WHERE": {
// 					"AND": [
// 						{ "GT": { sections_avg: 70 } },
// 						{ "IS": { sections_dept: "CPSC" } }
// 					]
// 				},
// 				"OPTIONS": {
// 					"COLUMNS": ["sections_dept", "sections_avg"]
// 				}
// 			};
// 			const result = queryEngine.processQuery(query);
// 			expect(result).to.have.lengthOf(2);
// 		});
//
// 		it("should handle OR combination", function () {
// 			const query = {
// 				"WHERE": {
// 					"OR": [
// 						{ "GT": { sections_avg: 80 } }
// 					]
// 				},
// 				"OPTIONS": {
// 					"COLUMNS": ["sections_instructor", "sections_avg"]
// 				}
// 			};
// 			const result = queryEngine.processQuery(query);
// 			expect(result).to.have.lengthOf(2);
// 		});
// 	});
//
//
// 	describe("should reject", function () {
// 		it("should reject query with results, size > 5000", function () {
// 		//	const largeNum = 5001;
// 			// const largeData = Array(largeNum);
// 			// something fishy going on here, wrong parameters in processQuery
// 			const query = {
// 				"WHERE": {},
// 				"OPTIONS": {
// 					"COLUMNS": ["sections_dept"]
// 				}
// 			};
// 			expect(() => queryEngine.processQuery(query))
// 				.to.throw(ResultTooLargeError);
// 		});
//
// 		it("should reject query with invalid dataset reference", function () {
// 			const query = {
// 				"WHERE": {
// 					"GT": { aaa: 97 }
// 				},
// 				"OPTIONS": {
// 					"COLUMNS": ["sections_dept"]
// 				}
// 			};
// 			expect(() => queryEngine.processQuery(query))
// 				.to.throw(InsightError);
// 		});
// 	});
// });
