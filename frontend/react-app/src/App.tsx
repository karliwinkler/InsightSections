import HomePage from "./components/HomePage.tsx"
import InsightsPage from "./components/InsightsPage.tsx";
import Dataset from "../../../src/controller/Dataset.ts";
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import {useEffect, useState} from "react";

// Contains HomePage component and functionality for adding, removing, and listing datasets
const App = () => {
	const [datasets, setDatasets] = useState<Dataset[]>([]);
	const [loading, setLoading] = useState<boolean>(true);
	const [error, setError] = useState<string | null>(null);

	const listDatasets = async () => {
		try {
			const response = await fetch("http://localhost:4321/datasets");
			if (!response.ok) throw new Error("Failed to fetch datasets");
			const data = await response.json();
			setDatasets(data.result || []);
		} catch (err) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	const handleAddDataset = async (datasetID: string, file: ArrayBuffer) => {
		try {
			const datasetKind = "sections";

			const blob = new Blob([file], { type: "application/zip" });

			const response = await fetch(`http://localhost:4321/dataset/${datasetID}/${datasetKind}`, {
				method: "PUT",
				headers: {
					"Content-Type": "application/zip"
				},
				body: blob,
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Unknown server error");
			} else {
				alert("Successfully added dataset '" + datasetID + "'");
				listDatasets();
			}

		} catch (err) {
			alert(`${err.message}`);
		}
	};

	const handleRemoveDataset = async (datasetID: string) => {
		try {
			const response = await fetch(`http://localhost:4321/dataset/${datasetID}`, {
				method: "DELETE",
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Unknown error");
			}

			alert(`Successfully removed dataset '${datasetID}'`);

			setDatasets((prev) => prev.filter((ds) => ds.id !== datasetID));
		} catch (err) {
			alert(`Failed to remove dataset: ${err.message}`);
		}
	};

	useEffect(() => {
		listDatasets();
	}, []);

	if (loading) return <div>Loading...</div>;
	if (error) return <div>Error: {error}</div>;

	return (
		<Router>
			<Routes>
				<Route
					path="/"
					element={<HomePage items={datasets}
									   onAddDataset={handleAddDataset}
									   onRemoveDataset={handleRemoveDataset}/>}
				/>
				<Route path="/insights/:datasetID" element={<InsightsPage />} />
			</Routes>
		</Router>
	);
};

export default App;

