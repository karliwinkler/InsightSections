import Section from "./Section";
import JSZip from "jszip";
import { InsightError } from "./IInsightFacade";

// returns true if string contains all fields for a section
function sectionIsValid(content: string): boolean {
	return (
		content.includes('"id":') &&
		content.includes('"Course":') &&
		content.includes('"Title":') &&
		content.includes('"Professor":') &&
		content.includes('"Subject":') &&
		content.includes('"Year":') &&
		content.includes('"Avg":') &&
		content.includes('"Pass":') &&
		content.includes('"Fail":') &&
		content.includes('"Audit":')
	);
}

// all following 'parse' functions find a specific field in the given string and parse it
// to get the data in string format
function parseId(str: string): string {
	const idStrStart = '"id":';
	const idStr = str.match(/("id":.*?,)/)![0];
	return idStr.slice(idStrStart.length, idStr.length - 1);
}

function parseCourse(str: string): string {
	const courseStrStart = '"Course":"';
	const courseStr = str.match(/("Course":.*?,)/)![0];
	return courseStr.slice(courseStrStart.length, courseStr.length - 2);
}

function parseTitle(str: string): string {
	const titleStrStart = '"Title":"';
	const titleStr = str.match(/("Title":.*?,)/)![0];
	return titleStr.slice(titleStrStart.length, titleStr.length - 2);
}

function parseProf(str: string): string {
	const profStrStart = '"Professor":"';
	const profStr = str.match(/("Professor":.*?",)/)![0];
	return profStr.slice(profStrStart.length, profStr.length - 2);
}

function parseSubject(str: string): string {
	const subjectStrStart = '"Subject":"';
	const subjectStr = str.match(/("Subject":.*?})/)![0];
	return subjectStr.slice(subjectStrStart.length, subjectStr.length - 2);
}

// parseYear also checks if the section is "overall", if so it sets the year to 1900
function parseYear(str: string): string {
	if (str.includes('"Section":"overall"')) {
		return "1900";
	}

	const yearStrStart = '"Year":"';
	const yearStr = str.match(/("Year":.*?,)/)![0];
	return yearStr.slice(yearStrStart.length, yearStr.length - 2);
}

function parseAvg(str: string): string {
	const avgStrStart = '"Avg":';
	const avgStr = str.match(/("Avg":.*?,)/)![0];
	return avgStr.slice(avgStrStart.length, avgStr.length - 1);
}

function parsePass(str: string): string {
	const passStrStart = '"Pass":';
	const passStr = str.match(/("Pass":.*?,)/)![0];
	return passStr.slice(passStrStart.length, passStr.length - 1);
}

function parseFail(str: string): string {
	const failStrStart = '"Fail":';
	const failStr = str.match(/("Fail":.*?,)/)![0];
	return failStr.slice(failStrStart.length, failStr.length - 1);
}

function parseAudit(str: string): string {
	const auditStrStart = '"Audit":';
	const auditStr = str.match(/("Audit":.*?,)/)![0];
	return auditStr.slice(auditStrStart.length, auditStr.length - 1);
}

// creates a section object by parsing the required fields from a given string
function createSection(str: string): Section {
	const idStr = parseId(str);
	const courseStr = parseCourse(str);
	const titleStr = parseTitle(str);
	const profStr = parseProf(str);
	const subjectStr = parseSubject(str);
	const yearNum = +parseYear(str);
	const avgNum = +parseAvg(str);
	const passNum = +parsePass(str);
	const failNum = +parseFail(str);
	const auditNum = +parseAudit(str);

	return new Section(idStr, courseStr, titleStr, profStr, subjectStr, yearNum, avgNum, passNum, failNum, auditNum);
}

export default class CourseDatasetProcessor {
	// returns true is string contains result key and all valid fields for a section
	public courseIsValid(content: string): boolean {
		return content.startsWith('{"result":[{') && sectionIsValid(content);
	}

	// converts course content in string form into section objects; returns array of section objects
	public courseToSections(content: string): Section[] {
		const resultString = '{"result":[';
		content = content.slice(resultString.length);
		// 11
		let sectionStrings = content.split(/({.*?})/);
		sectionStrings = sectionStrings.filter((str) => sectionIsValid(str));
		const sections: Section[] = [];
		for (const str of sectionStrings) {
			sections.push(createSection(str));
		}
		return sections;
	}

	// checks if string is valid base64
	public isBase64(str: string): boolean {
		try {
			return Buffer.from(str, "base64").toString("base64") === str.replace(/\r?\n|\r/g, "");
		} catch {
			return false;
		}
	}

	// unzips zip file and converts each course into a string. returns array of promises of all course strings
	public async processCourses(content: string): Promise<string[]> {
		const zip = await JSZip.loadAsync(content, { base64: true });
		const promises: any[] = [];

		if (zip.folder(/courses/).length !== 0) {
			zip.folder("courses")?.forEach(async (relativePath, course) => {
				promises.push(course.async("string"));
			});
		} else {
			throw new InsightError("no courses folder found in zip file");
		}

		return await Promise.all(promises);
	}
}
