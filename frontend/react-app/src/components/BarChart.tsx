import { Bar } from "react-chartjs-2";
import {
	Chart as ChartJS,
	CategoryScale,
	LinearScale,
	BarElement,
	Title,
	Tooltip,
	Legend,
} from "chart.js";
import { useEffect, useState } from "react";
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface Props {
	datasetId: string | undefined;
	dept: string;
}

const MAX_RESULTS = 5;

// Bar chart component containing data about top courses by grade average for a selected department
function BarChart({ datasetId, dept }: Props) {
	const [chartData, setChartData] = useState({
		labels: [] as string[],
		datasets: [
			{
				label: "Average Grade",
				data: [] as number[],
				backgroundColor: "rgb(249, 168, 212)",
			},
		],
	});

	useEffect(() => {
		const fetchChartData = async () => {
			const query = {
				WHERE: {
					IS: {
						[`${datasetId}_dept`]: dept,
					},
				},
				OPTIONS: {
					COLUMNS: [
						`${datasetId}_id`,
						`${datasetId}_title`,
						"overallAvg",
					],
					ORDER: {
						dir: "DOWN",
						keys: ["overallAvg"],
					},
				},
				TRANSFORMATIONS: {
					GROUP: [
						`${datasetId}_id`,
						`${datasetId}_title`,
					],
					APPLY: [
						{
							overallAvg: {
								AVG: `${datasetId}_avg`,
							},
						},
					],
				},
			};

			try {
				const response = await fetch("http://localhost:4321/query", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(query),
				});

				const json = await response.json();
				console.log("Bar chart query result:", json);

				if (response.ok) {
					const results = json.result;
					const topResults = results.slice(0, MAX_RESULTS);

					if (topResults.length === 0) {
						console.warn("No bar chart data returned.");
						return;
					}

					const labels = topResults.map((r: any) => {
						const id = r[`${datasetId}_id`];
						const rawTitle = r[`${datasetId}_title`] || "";
						const title = rawTitle.replace(/\\u0026|&amp;/g, "&"); // Replace \u0026 and &amp;
						return `${id}: ${title}`;
					});

					const values = topResults.map((r: any) =>
						parseFloat(r["overallAvg"].toFixed(2))
					);

					setChartData({
						labels,
						datasets: [
							{
								...chartData.datasets[0],
								data: values,
							},
						],
					});
				} else {
					console.error("Query failed:", json.error);
				}
			} catch (err) {
				console.error("Bar chart fetch error:", err);
			}
		};

		fetchChartData();
	}, [datasetId, dept]);

	const options = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: { display: true },
			tooltip: {
				backgroundColor: "#1E3A8A",
				titleFont: { size: 16, weight: "bold", color: "#fff" },
				bodyFont: { size: 14, color: "#fff" },
				padding: 10,
				cornerRadius: 6,
			},
		},
		scales: {
			y: {
				beginAtZero: true,
				min: 60,
				max: 100,
				ticks: {
					stepSize: 10,
				},
			},
		},
		animation: {
			duration: 1000,
			easing: "easeInOutQuad",
		},
	};

	return (
		<div className="w-full max-w-2xl h-[400px] mt-8 mb-3">
			<Bar data={chartData} options={options} />
		</div>
	);
}

export default BarChart;
