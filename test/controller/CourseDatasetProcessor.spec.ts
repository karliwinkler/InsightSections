import { clearDisk, getContentFromArchives } from "../TestUtil";
import CourseDatasetProcessor from "../../src/controller/CourseDatasetProcessor";
import { expect } from "chai";

describe("DatasetProcessor", function () {
	let dp: CourseDatasetProcessor;
	let sections: string;
	let astr514: string;
	let aanb500: string;

	before(async function () {
		dp = new CourseDatasetProcessor();
		sections = await getContentFromArchives("pair.zip");
		astr514 =
			'{"result":[{"tier_eighty_five":1,"tier_ninety":1,"Title":"observnl astronm","Section":"101","Detail":"","tier_seventy_two":0,"Other":0,"Low":81,"tier_sixty_four":0,"id":30121,"tier_sixty_eight":0,"tier_zero":0,"tier_seventy_six":0,"tier_thirty":0,"tier_fifty":0,"Professor":"hinshaw, gary","Audit":0,"tier_g_fifty":0,"tier_forty":0,"Withdrew":0,"Year":"2014","tier_twenty":0,"Stddev":4.24,"Enrolled":4,"tier_fifty_five":0,"tier_eighty":2,"tier_sixty":0,"tier_ten":0,"High":90,"Course":"514","Session":"w","Pass":4,"Fail":0,"Avg":86,"Campus":"ubc","Subject":"astr"},{"tier_eighty_five":1,"tier_ninety":1,"Title":"observnl astronm","Section":"overall","Detail":"","tier_seventy_two":0,"Other":0,"Low":81,"tier_sixty_four":0,"id":30122,"tier_sixty_eight":0,"tier_zero":0,"tier_seventy_six":0,"tier_thirty":0,"tier_fifty":0,"Professor":"","Audit":0,"tier_g_fifty":0,"tier_forty":0,"Withdrew":0,"Year":"2014","tier_twenty":0,"Stddev":4.24,"Enrolled":4,"tier_fifty_five":0,"tier_eighty":2,"tier_sixty":0,"tier_ten":0,"High":90,"Course":"514","Session":"w","Pass":4,"Fail":0,"Avg":86,"Campus":"ubc","Subject":"astr"}],"rank":0}';
		aanb500 = '{"result":[],"rank":0}';
		await clearDisk();
	});

	describe("courseToSections", function () {
		it("should return array of section objects successfully", async function () {
			const sectionArray = dp.courseToSections(astr514);
			expect(sectionArray.length).to.equal(2);
			const s1 = sectionArray[0];
			expect(s1.getUuid()).to.equal("30121");
			expect(s1.getId()).to.equal("514");
			expect(s1.getTitle()).to.equal("observnl astronm");
			expect(s1.getInstructor()).to.equal("hinshaw, gary");
			expect(s1.getDept()).to.equal("astr");
			// expect(s1.getYear()).to.equal(2014);
			// expect(s1.getAvg()).to.equal(86);
			// expect(s1.getPass()).to.equal(4);
			expect(s1.getFail()).to.equal(0);
			expect(s1.getAudit()).to.equal(0);

			const s2 = sectionArray[1];
			expect(s2.getUuid()).to.equal("30122");
			expect(s2.getId()).to.equal("514");
			expect(s2.getTitle()).to.equal("observnl astronm");
			expect(s2.getInstructor()).to.equal("");
			expect(s2.getDept()).to.equal("astr");
			// expect(s2.getYear()).to.equal(1900);
			// expect(s2.getAvg()).to.equal(86);
			// expect(s2.getPass()).to.equal(4);
			expect(s2.getFail()).to.equal(0);
			expect(s2.getAudit()).to.equal(0);
		});

		it("should return empty array, no valid sections", async function () {
			const sectionArray = dp.courseToSections(aanb500);
			expect(sectionArray.length).to.equal(0);
		});
	});

	describe("isBase64", function () {
		it("should return true for valid base64 string", async function () {
			const result = dp.isBase64(sections);
			expect(result).to.equal(true);
		});

		it("should return false for invalid string", async function () {
			const result = dp.isBase64("abc");
			expect(result).to.equal(false);
		});
	});

	describe("courseIsValid", function () {
		it("should return true for valid course", async function () {
			const result = dp.courseIsValid(astr514);
			expect(result).to.equal(true);
		});

		it("should return false for invalid course", async function () {
			const result = dp.isBase64(aanb500);
			expect(result).to.equal(false);
		});
	});
});
