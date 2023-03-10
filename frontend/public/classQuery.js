const handler = () => {
	const id = document.getElementById("cid").value.toLowerCase();
	const dept = document.getElementById("dept").value.toLowerCase();
	const query = createCourseQuery(id, dept);
	const request = new XMLHttpRequest();
	request.responseType = "json";
	request.onload = () => {
		if (request.status === 400) {
			alert(request.response.error + ".  Please check the course entered and try again!");
		} else {
			console.log("hello", request.response.result);
			createCourseTable(request.response.result);
		}
	};
	request.open("POST", "http://localhost:4321/query");
	request.setRequestHeader("Content-Type", "application/json");
	request.send(JSON.stringify(query));
};

const createCourseQuery = (id, dept) => {
	const query = {
		WHERE: {
			AND: [
				{
					IS: {
						sections_dept: dept,
					},
				},
				{
					IS: {
						sections_id: id,
					},
				},
			],
		},
		OPTIONS: {
			COLUMNS: ["sections_dept", "sections_id", "sections_avg", "sections_year"],
		},
	};
	return query;
};

// table style in style.css is from: https://www.w3schools.com/css/tryit.asp?filename=trycss_table_fancy
// create table method reference: https://www.youtube.com/watch?v=ru_YWeOh2kU&t=106s
const createCourseTable = (resultArray) => {
	let table = document.getElementById("courseQueryResult");
	table.innerHTML = "";

	for (let i = 0; i < resultArray.length; i++) {
		let row = `<tr>
				<td>${resultArray[i].sections_dept}</td>
				<td>${resultArray[i].sections_id}</td>
				<td>${resultArray[i].sections_avg}</td>
				<td>${resultArray[i].sections_year}</td>
			</tr>`;
		table.innerHTML += row;
	}
};
document.getElementById("searchCourseButton").addEventListener("click", handler);
