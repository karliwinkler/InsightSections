import { Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from "chart.js";
import { useEffect, useState } from "react";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

interface Props {
	datasetId: string | undefined;
	dept: string;
	course: string;
}

// Line chart component containing data about course average over time for a selected course
function LineChart({ datasetId, dept, course }: Props) {
	const [chartData, setChartData] = useState({
		labels: [] as string[],
		datasets: [
			{
				label: "Average Grade",
				data: [] as number[],
				borderColor: "rgba(54, 162, 235, 1)",
				pointBackgroundColor: "rgba(54, 162, 235, 1)",
				backgroundColor: "rgba(54, 162, 235, 1)",
				pointRadius: 5,
				pointHoverRadius: 8,
				borderWidth: 3,
				tension: 0.4,
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
						"yearAvg"
					],
					ORDER: {
						dir: "UP",
						keys: [`${datasetId}_year`]
					}
				},
				TRANSFORMATIONS: {
					GROUP: [
						`${datasetId}_year`
					],
					APPLY: [
						{
							yearAvg: {
								AVG: `${datasetId}_avg`
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

				if (response.ok) {
					const results = json.result;

					const filtered = results.filter((r: any) => r[`${datasetId}_year`] !== 1900);
					const labels = filtered.map((r: any) => r[`${datasetId}_year`]);
					const values = filtered.map((r: any) => parseFloat(r["yearAvg"].toFixed(2)));

					setChartData({
						labels,
						datasets: [
							{
								...chartData.datasets[0],
								data: values
							}
						]
					});
				} else {
					console.error("Query failed:", json.error);
				}
			} catch (error) {
				console.error("Error fetching chart data:", error);
			}
		};

		fetchChartData();
	}, [datasetId, dept, course]);

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
				beginAtZero: false,
				min: 60,
				max: 100,
				ticks: { stepSize: 10, callback: (value: number) => value + "%" },
			},
		},
	};

	return (
		<div className="w-full max-w-2xl h-[400px] mt-8 mb-3">
			<Line data={chartData} options={options}/>
		</div>
	);
}

export default LineChart;

