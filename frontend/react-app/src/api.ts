import {InsightDataset, InsightResult} from "../../../src/controller/IInsightFacade.ts";

const apiURL = "http://localhost:4321";
//Generative AI used to develop this class

export default class API {
	static async addDataset(id: string, kind: string, file: File): Promise<string[]> {
		try {
			const content = await file.arrayBuffer();
			const response = await fetch(`${apiURL}/dataset/${id}/${kind}`, {
				method: "PUT",
				headers: { "Content-Type": "application/octet-stream" },
				body: content,
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error);
			}
			const data = await response.json();
			return data.result;
		} catch (error) {
			if (error instanceof Error) {
				throw error;
			}
			throw new Error("An unknown error occurred");
		}
	}


	static async removeDataset(id: string): Promise<string> {
		const response = await fetch(`${apiURL}/dataset/${id}`, {
			method: "DELETE",
		});
		const data = await response.json();
		return data.result;
	}

	static async performQuery(query: object): Promise<InsightResult[]> {
		const response = await fetch(`${apiURL}/query`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(query),
		});
		const data = await response.json();
		return data.result;
	}

	static async listDatasets(): Promise<InsightDataset[]> {
		const response = await fetch(`${apiURL}/datasets`, {
			method: "GET",
		});
		const data = await response.json();
		return data.result;
	}
}
