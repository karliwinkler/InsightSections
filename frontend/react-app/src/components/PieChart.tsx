import { Doughnut } from "react-chartjs-2";
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from "chart.js";
import { useEffect, useState } from "react";

ChartJS.register(ArcElement, Tooltip, Legend);

interface Props {
	datasetId: string | undefined;
	dept: string;
	course: string;
}

// Pie chart component containing data about the number of passing vs failing grades for a selected course
function PieChart({ datasetId, dept, course }: Props) {
	const [chartData, setChartData] = useState({
		labels: ["Passed", "Failed"],
		datasets: [
			{
				label: "Pass vs Fail Rate",
				data: [0, 0],
				backgroundColor: ["#A5B4FC", "#EC4899"],
				hoverOffset: 20,
			},
		],
	});

	useEffect(() => {
		const fetchChartData = async () => {
			const query = {
				WHERE: {
					AND: [
						{
							IS: {
								[`${datasetId}_dept`]: dept
							}
						},
						{
							IS: {
								[`${datasetId}_id`]: course
							}
						}
					]
				},
				OPTIONS: {
					COLUMNS: [
						`${datasetId}_year`,
						`${datasetId}_title`,
						"passingCount",
						"failingCount"
					],
					ORDER: {
						dir: "UP",
						keys: [`${datasetId}_year`]
					}
				},
				TRANSFORMATIONS: {
					GROUP: [
						`${datasetId}_year`,
						`${datasetId}_title`
					],
					APPLY: [
						{
							passingCount: {
								SUM: `${datasetId}_pass`
							}
						},
						{
							failingCount: {
								SUM: `${datasetId}_fail`
							}
						}
					]
				}
			};

			try {
				const response = await fetch("http://localhost:4321/query", {
					method: "POST",
					headers: {
						"Content-Type": "application/json"
					},
					body: JSON.stringify(query)
				});

				const json = await response.json();
				console.log("Pie query response:", json);

				if (response.ok) {
					const results = json.result;

					if (results.length === 0) {
						console.warn("No pie chart data returned.");
						return;
					}

					let totalPass = 0;
					let totalFail = 0;

					for (const row of results) {
						totalPass += row["passingCount"];
						totalFail += row["failingCount"];
					}

					setChartData({
						labels: ["Passed", "Failed"],
						datasets: [
							{
								label: "Pass vs Fail Rate",
								data: [totalPass, totalFail],
								backgroundColor: ["#A5B4FC", "#EC4899"],
								hoverOffset: 4,
							},
						],
					});
				} else {
					console.error("Pie chart query failed:", json.error);
				}
			} catch (err) {
				console.error("Pie chart fetch error:", err);
			}
		};

		fetchChartData();
	}, [datasetId, dept, course]);

	const options = {
		responsive: true,
		maintainAspectRatio: false,
		plugins: {
			legend: {
				display: true,
				position: "bottom",
				labels: {
					font: { size: 16, family: "Arial" },
					boxWidth: 30,
					padding: 20,
				},
			},
			tooltip: {
				backgroundColor: "#1E3A8A",
				titleFont: { size: 16, weight: "bold", color: "#fff" },
				bodyFont: { size: 14, color: "#fff" },
				padding: 10,
				cornerRadius: 6,
				callbacks: {
					label: function (context: any) {
						const dataset = context.dataset;
						const value = dataset.data[context.dataIndex];
						const total = dataset.data.reduce((sum: number, val: number) => sum + val, 0);
						const percentage = ((value / total) * 100).toFixed(1);
						const label = context.label || "";
						return `${label}: ${percentage}%`;
					},
				},
			},
		},
	};

	return (
		<div className="w-full max-w-2xl h-[400px] mt-8 mb-3">
			<Doughnut data={chartData} options={options} />
		</div>
	);
}

export default PieChart;

