import {useEffect, useState} from "react";
import { useParams } from "react-router-dom";
import BarChart from "./BarChart";
import LineChart from "./LineChart";
import PieChart from "./PieChart";

// Page containing data insights for a department and course selected by user
function InsightsPage() {
	const { datasetID } = useParams<{ datasetID: string }>();
	const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
	const [coursesByDepartment, setCoursesByDepartment] = useState<Record<string, string[]>>({});
	const [selectedDepartment, setSelectedDepartment] = useState("");
	const [selectedCourse, setSelectedCourse] = useState("");

	const courseOptions = selectedDepartment ? coursesByDepartment[selectedDepartment] || [] : [];

	useEffect(() => {
		const originalTitle = document.title;
		if (datasetID) {
			document.title = `Insights for ${datasetID}`;
		}
		return () => {
			document.title = originalTitle;
		};
	}, [datasetID]);


	useEffect(() => {
		const fetchDepartments = async () => {
			const query = {
				WHERE: {},
				OPTIONS: { COLUMNS: [`${datasetID}_dept`] },
				TRANSFORMATIONS: {
					GROUP: [`${datasetID}_dept`],
					APPLY: [
						{
							uniqueCount: { COUNT: `${datasetID}_dept` }
						}
					]
				}
			};

			try {
				const res = await fetch("http://localhost:4321/query", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(query)
				});
				const json = await res.json();
				if (res.ok) {
					const depts = json.result.map((r: any) => r[`${datasetID}_dept`]);
					setDepartmentOptions(depts);
				} else {
					console.error("Error fetching departments:", json.error);
				}
			} catch (err) {
				console.error("Department fetch error:", err);
			}
		};

		fetchDepartments();
	}, []);

	useEffect(() => {
		const fetchCourses = async () => {
			if (!selectedDepartment) return;

			const query = {
				WHERE: {
					IS: {
						[`${datasetID}_dept`]: selectedDepartment
					}
				},
				OPTIONS: { COLUMNS: [`${datasetID}_id`] },
				TRANSFORMATIONS: {
					GROUP: [`${datasetID}_id`],
					APPLY: [
						{
							uniqueCount: { COUNT: `${datasetID}_id` }
						}
					]
				}
			};

			try {
				const res = await fetch("http://localhost:4321/query", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify(query)
				});
				const json = await res.json();
				if (res.ok) {
					const courses = json.result.map((r: any) => r[`${datasetID}_id`]);
					setCoursesByDepartment((prev) => ({
						...prev,
						[selectedDepartment]: courses
					}));
				} else {
					console.error("Error fetching courses:", json.error);
				}
			} catch (err) {
				console.error("Course fetch error:", err);
			}
		};

		fetchCourses();
	}, [selectedDepartment]);

	return (
		<>
			<div className="flex flex-col items-center pt-16 min-h-screen bg-gradient-to-t from-pink-100 to-blue-50 text-blue-900">
				<header>
					<h1 className="text-5xl font-bold">Insights for {datasetID}</h1>
				</header>

				<p className="text-lg italic mt-2 text-indigo-300">Select a department and course to view data</p>

				<div className="flex flex-col items-center gap-8 pt-8 max-w-6xl">

					<div className="flex flex-row items-center gap-4">

						<div>
							<label className="text-lg p-2 font-semibold">Select Department:</label>
							<select
								className="mt-2 p-2 border border-gray-300 rounded-md"
								value={selectedDepartment}
								onChange={(e) => {
									setSelectedDepartment(e.target.value);
									setSelectedCourse(""); // Reset course selection when department changes
								}}
							>
								<option value="" disabled>Select a department...</option>
								{departmentOptions.map(dept => (
									<option key={dept} value={dept}>{dept}</option>
								))}
							</select>
						</div>

						{selectedDepartment && (
							<div>
								<label className="text-lg p-2 font-semibold">Select Course:</label>
								<select
									className="mt-2 p-2 border border-gray-300 rounded-md"
									value={selectedCourse}
									onChange={(e) => setSelectedCourse(e.target.value)}
									disabled={courseOptions.length === 0}
								>
									<option value="" disabled>Select a course...</option>
									{courseOptions.map(course => (
										<option key={course} value={course}>{selectedDepartment} {course}</option>
									))}
								</select>
							</div>
						)}
					</div>

					{selectedDepartment && selectedCourse && (
						<>
							<div className="flex flex-row items-center gap-8">

								<div className="flex flex-col items-center p-5 rounded-3xl bg-white shadow">
									<h1 className="text-3xl font-bold">{selectedDepartment.toLocaleUpperCase()} {selectedCourse} Grade Average by Year</h1>
									<LineChart datasetId={datasetID} dept={selectedDepartment} course={selectedCourse} />
								</div>

								<div className="flex flex-col items-center p-5 rounded-3xl bg-white shadow">
									<h1 className="text-3xl font-bold">{selectedDepartment.toLocaleUpperCase()} {selectedCourse} Pass vs. Fail Rate</h1>
									<PieChart datasetId={datasetID} dept={selectedDepartment} course={selectedCourse} />
								</div>
							</div>

							<div className="flex flex-col items-center w-full p-5 rounded-3xl bg-white shadow">
								<h1 className="text-3xl font-bold">Top {selectedDepartment.toLocaleUpperCase()} Courses by Grade Average</h1>
								<BarChart datasetId={datasetID} dept={selectedDepartment}/>
							</div>

							<div className="p-4"></div>
						</>
					)}

				</div>
			</div>
		</>
	);
}

export default InsightsPage;
