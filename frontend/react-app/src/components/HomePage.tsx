import Dataset from "../../../../src/controller/Dataset.ts";
import { useNavigate } from 'react-router-dom';
import { useRef, useState, ChangeEvent } from 'react';
import API from "../api.ts";
import {InsightDatasetKind} from "../../../../src/controller/IInsightFacade.ts";

interface Props {
	items: Dataset[];
	onAddDataset?: (datasetID: string, fileContents: ArrayBuffer) => Promise<void>;
	onRemoveDataset?: (datasetID: string) => Promise<void>;
}

// Contains main features of home page - buttons, file upload, UI, etc.
function HomePage({ items, onAddDataset, onRemoveDataset }: Props) {

	const navigate = useNavigate();
	const fileInputRef = useRef<HTMLInputElement>(null);
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [datasetId, setDatasetId] = useState<string>("");
	const [isUploading, setIsUploading] = useState(false);


	const handleRemove = async (id: string) => {
		const confirmed = confirm(`Are you sure you want to remove dataset '${id}'?`);
		if (!confirmed) return;

		if (onRemoveDataset) {
			await onRemoveDataset(id);
		}
	};

	const handleViewInsights = (id: string) => {
		navigate(`/insights/${id}`);
	}

	const handleAddDatasetClick = () => {
		if (!datasetId.trim()) {
			alert("Please enter a dataset ID.");
			return;
		}
		fileInputRef.current?.click();
	};

	const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
		const files = event.target.files;
		if (files && files.length > 0) {
			const file = files[0];
			setSelectedFile(file);

			const reader = new FileReader();
			reader.readAsArrayBuffer(file);
			reader.onload = async () => {
				if (reader.result instanceof ArrayBuffer) {
					if (onAddDataset) {
						try {
							setIsUploading(true);
							await onAddDataset(datasetId, reader.result);
							setDatasetId('');
						} catch (error) {
							alert("Failed to upload dataset");
							console.error(error);
						} finally {
							setIsUploading(false);
						}
					}
				}
			};

			reader.onerror = () => {
				setIsUploading(false);
				alert("Error reading file.");
				console.error(reader.error);
			};
		}
	};

	return (
		<>
			<div className="flex flex-col items-center pt-16 min-h-screen bg-gradient-to-t from-pink-100 to-blue-50 text-blue-900">
				<header>
					<h1 className="text-6xl font-bold">Insight Sections</h1>
				</header>
				<p className="text-lg italic mt-2 text-indigo-300">Explore UBC course data</p>

				<h1 className="text-2xl font-bold mt-8">My Datasets</h1>

				<div className="space-y-4 mt-2 w-full max-w-2xl">
					{items.length === 0 ? (
						<p className="text-center text-lg text-gray-500 italic mt-4">
							No datasets added yet. Enter a dataset ID and upload course data to get started.
						</p>
					) : (
						<ul className="space-y-4">
							{items.map((item) => (
								<li
									className="bg-blue-200 p-8 rounded-3xl shadow-md"
									key={item.id}
								>
									<div className="flex flex-col">
										<h3 className="text-xl font-semibold">{item.id}</h3>
										<p className="text-gray-700 mt-2">{item.numRows} total course sections.</p>
									</div>

									<div className="flex justify-center space-x-4 mt-4">
										<button
											className="bg-indigo-500 text-white px-4 py-2 rounded-lg hover:bg-indigo-600 transition-colors duration-300"
											onClick={() => handleViewInsights(item.id)}
										>
											View Insights
										</button>
										<button
											className="bg-indigo-500 text-white px-3 py-2 rounded-lg hover:bg-indigo-600 transition-colors duration-300"
											onClick={() => handleRemove(item.id)}
										>
											Remove Dataset
										</button>
									</div>
								</li>
							))}
						</ul>
					)}
				</div>

				{isUploading && (
					<div className="flex items-center mt-4 space-x-2 text-indigo-600">
						<svg
							className="animate-spin h-5 w-5 text-indigo-600"
							xmlns="http://www.w3.org/2000/svg"
							fill="none"
							viewBox="0 0 24 24"
						>
							<circle
								className="opacity-25"
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								strokeWidth="4"
							></circle>
							<path
								className="opacity-75"
								fill="currentColor"
								d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
							></path>
						</svg>
						<span>Uploading dataset...</span>
					</div>
				)}

				<div className="mt-8 flex flex-col items-center">
					<input
						type="text"
						placeholder="Enter dataset ID"
						value={datasetId}
						onChange={(e) => setDatasetId(e.target.value)}
						className="border-2 border-gray-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-400"
					/>
				</div>

				<input
					type="file"
					ref={fileInputRef}
					onChange={handleFileChange}
					className="hidden"
					accept=".zip"
				/>

				<div className="mt-3 mb-8 flex flex-col items-center">
					<button
						className="bg-pink-500 text-white px-8 py-3 rounded-xl hover:bg-pink-600 transition-colors duration-300"
						onClick={handleAddDatasetClick}
					>
						Add New Dataset
					</button>

					{selectedFile && (
						<p className="text-sm text-gray-700 mt-2">
							Selected: {selectedFile.name}
						</p>
					)}
				</div>

			</div>
		</>
	)
}

export default HomePage;
