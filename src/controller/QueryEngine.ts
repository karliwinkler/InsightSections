import QueryValidator, { InsightQuery, SortObject, PossibleOption, ApplyRule, Transformations } from "./QueryValidator";
import { InsightError, InsightResult } from "./IInsightFacade";
import Section from "./Section";
import Room from "./Room";
import Decimal from "decimal.js";

const LOGICCOMPARATORS = new Set(["AND", "OR"]);
const SCOMPARATORS = ["IS"];
const MCOMPARATORS = ["LT", "GT", "EQ"];
const NEGATION = ["NOT"];

export interface QueryTree {
	//parents
	AND?: QueryTree[];
	OR?: QueryTree[];
	NOT?: QueryTree;

	//leaves
	GT?: Record<string, number>;
	LT?: Record<string, number>;
	EQ?: Record<string, number>;
	IS?: Record<string, string>;
}

type InsightDataType = Section | Room;

// export interface PossibleOption {
// 	COLUMNS: string[]; //KEY[] | string[];
// 	ORDER?: string;
// }

// export interface InsightQuery {
// 	WHERE: {};
// 	OPTIONS: {};
// 	TRANSFORMATIONS?: {}; //create Transformations interface for C2
// }

export default class QueryEngine {
	private query: unknown;
	private validator: QueryValidator;
	private datasetID: string;
	private items: InsightDataType[];

	constructor(query: unknown, datasetMap: Map<string, Array<InsightDataType>>) {
		this.query = query;
		this.validator = new QueryValidator(this.query);
		this.datasetID = this.validator.getDatasetID();
		if (datasetMap.get(this.datasetID) === undefined) {
			throw new InsightError();
		}
		this.items = datasetMap.get(this.datasetID) as Array<InsightDataType>;
	}

	public validateQuery(query: any): void {
		this.validator.validateQuery();
	}

	public processQuery(): InsightResult[] {
		const query = this.query as InsightQuery;
		let result: InsightDataType[] = this.items;

		if (Object.keys(query.WHERE).length !== 0) {
			result = this.handleWhere(query.WHERE, this.items);
		}

		let results: InsightResult[] = [];
		if (query.TRANSFORMATIONS) {
			results = this.applyTransformations(result, query.TRANSFORMATIONS as Transformations);
		} else {
			results = this.formatResults(result, query.OPTIONS as PossibleOption);
		}

		return results;
	}

	private handleWhere(where: QueryTree, items: InsightDataType[]): InsightDataType[] {
		if (!where || Object.keys(where).length === 0) {
			return items;
		}

		const key = Object.keys(where)[0];

		if (LOGICCOMPARATORS.has(key)) {
			return this.handleLogicComparison(key, where, items);
		}

		if (MCOMPARATORS.includes(key)) {
			return this.handleMComparison(where, items);
		}

		if (SCOMPARATORS.includes(key)) {
			return this.handleSComparison(where, items);
		}

		if (NEGATION.includes(key)) {
			return this.handleNegation(where, items);
		}

		return items;
	}

	private handleLogicComparison(key: string, where: QueryTree, items: InsightDataType[]): InsightDataType[] {
		const subFilters = where[key as keyof QueryTree] as QueryTree[];

		if (!subFilters || subFilters.length === 0) {
			return key === "AND" ? items : [];
		}

		if (key === "AND") {
			let result = items;
			for (const subFilter of subFilters) {
				result = this.handleWhere(subFilter, result);
				if (result.length === 0) {
					break;
				}
			}
			return result;
		} else if (key === "OR") {
			const result: InsightDataType[] = [];
			const uniqueItems = new Set<InsightDataType>();

			for (const subFilter of subFilters) {
				const subResult = this.handleWhere(subFilter, items);
				for (const item of subResult) {
					if (!uniqueItems.has(item)) {
						uniqueItems.add(item);
						result.push(item);
					}
				}
			}
			return result;
		}

		return [];
	}

	private handleNegation(where: QueryTree, items: InsightDataType[]): InsightDataType[] {
		if (!where.NOT) {
			return items;
		}

		const subFilter = where.NOT as QueryTree;
		const subResult = this.handleWhere(subFilter, items);
		return items.filter((item) => !subResult.includes(item));
	}

	private handleMComparison(where: QueryTree, items: InsightDataType[]): InsightDataType[] {
		const key = Object.keys(where)[0] as keyof QueryTree;
		if (!where[key]) {
			return [];
		}

		const fieldMap = where[key] as Record<string, number>;
		if (Object.keys(fieldMap).length === 0) {
			return [];
		}

		const field = Object.keys(fieldMap)[0];
		const value = fieldMap[field];
		const fieldName = this.extractFieldName(field);

		return items.filter((item) => {
			const itemValue = this.getItemValue(item, fieldName);

			if (typeof itemValue !== "number") {
				return false;
			}

			switch (key) {
				case "GT":
					return itemValue > value;
				case "LT":
					return itemValue < value;
				case "EQ":
					return itemValue === value;
				default:
					return false;
			}
		});
	}

	private handleSComparison(where: QueryTree, items: InsightDataType[]): InsightDataType[] {
		const key = Object.keys(where)[0] as keyof QueryTree;
		if (!where[key]) {
			return [];
		}

		const fieldMap = where[key] as Record<string, string>;
		if (Object.keys(fieldMap).length === 0) {
			return [];
		}

		const field = Object.keys(fieldMap)[0];
		const value = fieldMap[field];

		const fieldName = this.extractFieldName(field);

		return items.filter((item) => {
			const itemValue = this.getItemValue(item, fieldName);

			if (typeof itemValue !== "string") {
				return false;
			}

			return this.matchStringWithWildcard(itemValue, value);
		});
	}

	// private getItemValue(item: InsightDataType, fieldName: string): any {
	// 	const isRoom = this.items.length > 0 && this.items[0] instanceof Room;
	//
	// 	if (isRoom)
	//
	// 	return item[fieldName as keyof InsightDataType] || (item as any)[fieldName];
	// }

	private getItemValue(item: InsightDataType, fieldName: string): string | number {
		const isRoom = item instanceof Room;

		if (isRoom) {
			const room = item as Room;

			switch (fieldName) {
				case "fullname":
					return room.getFullName();
				case "shortname":
					return room.getShortName();
				case "number":
					return room.getNumber();
				case "name":
					return room.getName();
				case "address":
					return room.getAddr();
				case "lat":
					return room.getLat();
				case "lon":
					return room.getLon();
				case "seats":
					return room.getSeats();
				case "type":
					return room.getType();
				case "furniture":
					return room.getFurniture();
				case "href":
					return room.getLink();
			}
		}

		const requiredValue = (item as any)[fieldName];
		if (requiredValue !== undefined) {
			return requiredValue;
		}

		return "";
	}

	private formatResults(items: InsightDataType[], options: PossibleOption): InsightResult[] {
		if (!options?.COLUMNS || !Array.isArray(options.COLUMNS)) {
			return [];
		}

		const columns = options.COLUMNS;

		const formattedResults: InsightResult[] = items.map((item) => {
			const result: InsightResult = {};
			columns.forEach((column) => {
				const fieldName = this.extractFieldName(column);
				const value = this.getItemValue(item, fieldName);
				result[column] = value;
			});
			return result;
		});

		if (options.ORDER) {
			this.sortResults(formattedResults, options.ORDER);
		}

		return formattedResults;
	}

	private applyTransformations(items: InsightDataType[], transformations: Transformations): InsightResult[] {
		const group = Object.values(transformations.GROUP) as string[];
		const apply = Object.values(transformations.APPLY);

		const groups = this.groupItems(items, group);

		const results: InsightResult[] = [];
		for (const [groupKey, groupItems] of groups.entries()) {
			const result: InsightResult = {};

			const groupValues = groupKey.split("delimiter");
			group.forEach((key, index) => {
				result[key] = this.parseValue(groupValues[index]);
			});

			if (apply.length > 0) {
				this.applyTokens(result, groupItems, apply);
			}

			results.push(result);
		}

		return this.formatTransformedResults(results, transformations);
	}

	private groupItems(items: InsightDataType[], groupKeys: string[]): Map<string, InsightDataType[]> {
		const groups = new Map<string, InsightDataType[]>();

		for (const item of items) {
			const groupValues = groupKeys.map((key) => {
				const fieldName = this.extractFieldName(key);
				const value = this.getItemValue(item, fieldName);
				return value !== undefined ? value.toString() : "undefined";
			});

			const groupKey = groupValues.join("delimiter");

			if (!groups.has(groupKey)) {
				groups.set(groupKey, []);
			}
			groups.get(groupKey)?.push(item);
		}

		return groups;
	}

	private applyTokens(result: InsightResult, items: InsightDataType[], applyRules: ApplyRule[]): void {
		for (const rule of applyRules) {
			const applyKey = Object.keys(rule)[0];
			const applyValue = rule[applyKey];
			const token = Object.keys(applyValue)[0];
			const key = applyValue[token];
			const fieldName = this.extractFieldName(key);

			switch (token) {
				case "MAX":
					result[applyKey] = this.calculateMax(items, fieldName);
					break;
				case "MIN":
					result[applyKey] = this.calculateMin(items, fieldName);
					break;
				case "AVG":
					result[applyKey] = this.calculateAvg(items, fieldName);
					break;
				case "SUM":
					result[applyKey] = this.calculateSum(items, fieldName);
					break;
				case "COUNT":
					result[applyKey] = this.calculateCount(items, fieldName);
					break;
			}
		}
	}

	private calculateMax(items: InsightDataType[], fieldName: string): number {
		let max = Number.NEGATIVE_INFINITY;
		for (const item of items) {
			const value = this.getItemValue(item, fieldName);
			if (typeof value === "number" && value > max) {
				max = value;
			}
		}
		return max;
	}

	private calculateMin(items: InsightDataType[], fieldName: string): number {
		let min = Number.POSITIVE_INFINITY;
		for (const item of items) {
			const value = this.getItemValue(item, fieldName);
			if (typeof value === "number" && value < min) {
				min = value;
			}
		}
		return min;
	}

	private calculateAvg(items: InsightDataType[], fieldName: string): number {
		let total = new Decimal(0);
		let numRows = 0;

		for (const item of items) {
			const value = this.getItemValue(item, fieldName);
			if (typeof value === "number") {
				const decimalValue = new Decimal(value);
				total = total.add(decimalValue);
				numRows++;
			}
		}

		if (numRows === 0) {
			return 0;
		}
		const avg = total.toNumber() / numRows;
		return Number(avg.toFixed(2));
	}

	private calculateSum(items: InsightDataType[], fieldName: string): number {
		let total = new Decimal(0);

		for (const item of items) {
			const value = this.getItemValue(item, fieldName);
			if (typeof value === "number") {
				total = total.add(new Decimal(value));
			}
		}

		return Number(total.toFixed(2));
	}

	private calculateCount(items: InsightDataType[], fieldName: string): number {
		const uniqueValues = new Set();

		for (const item of items) {
			const value = this.getItemValue(item, fieldName);
			if (value !== undefined) {
				uniqueValues.add(JSON.stringify(value));
			}
		}

		return uniqueValues.size;
	}

	private formatTransformedResults(results: InsightResult[], transformations: Transformations): InsightResult[] {
		const query = this.query as InsightQuery;
		const options = query.OPTIONS as PossibleOption;
		const columns = options.COLUMNS;

		const filteredResults = results.map((result) => {
			const filteredResult: InsightResult = {};
			columns.forEach((column) => {
				filteredResult[column] = result[column];
			});
			return filteredResult;
		});

		if (options.ORDER) {
			this.sortResults(filteredResults, options.ORDER);
		}

		return filteredResults;
	}

	private sortResults(results: InsightResult[], order: string | SortObject): void {
		if (typeof order === "string") {
			// this block of code is generated by an AI tool
			results.sort((a, b) => {
				const aValue = a[order];
				const bValue = b[order];

				if (typeof aValue === "number" && typeof bValue === "number") {
					return aValue - bValue;
				} else if (typeof aValue === "string" && typeof bValue === "string") {
					return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
				}
				return 0;
			});
			// end of AI generated block of code
		} else {
			const { dir, keys } = order;

			results.sort((a, b) => {
				for (const key of keys) {
					const aValue = a[key];
					const bValue = b[key];

					let comparison = 0;
					if (typeof aValue === "number" && typeof bValue === "number") {
						comparison = aValue - bValue;
					} else if (typeof aValue === "string" && typeof bValue === "string") {
						comparison = aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
					}

					// diff values, return the comparison
					if (comparison !== 0) {
						return dir === "UP" ? comparison : -comparison;
					}
				}
				return 0;
			});
		}
	}
	private extractFieldName(field: string): string {
		// Separates "datasetID_fieldName" into just "fieldName"
		const parts = field.split("_");
		if (parts.length > 1) {
			return parts[1]; // Return the field part without the dataset ID
		}
		return field;
	}

	private matchStringWithWildcard(sectionValue: string, pattern: string): boolean {
		if (!sectionValue || !pattern) {
			return false;
		}

		if (pattern === "*") {
			return true; // Match everything
		}

		const startsWithStar = pattern.startsWith("*");
		const endsWithStar = pattern.endsWith("*");

		// No wildcards, exact match
		if (!startsWithStar && !endsWithStar) {
			return sectionValue === pattern;
		}

		// Just "*" wildcard
		if (pattern === "*") {
			return true;
		}

		// Remove wildcards
		const patternContent = pattern.replace(/^\*|\*$/g, "");

		// *text*
		if (startsWithStar && endsWithStar) {
			return sectionValue.includes(patternContent);
		}

		// *text
		if (startsWithStar) {
			return sectionValue.endsWith(patternContent);
		}

		// text*
		if (endsWithStar) {
			return sectionValue.startsWith(patternContent);
		}

		return false;
	}
	// end of AI generated code block

	// this helper function is also generated by AI
	private parseValue(value: string): string | number {
		// Try to parse as number
		const num = Number(value);
		return isNaN(num) ? value : num;
	}
}
