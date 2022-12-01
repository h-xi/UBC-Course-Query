
document.getElementById("searchRoomButton").addEventListener("click", handleSearchRoom);


function handleSearchRoom() {
	const classSize = parseFloat(document.getElementById("cSize").value);
	console.log(classSize);
	let roomQuery = createRoomQuery(classSize);
	const httpRequest = new XMLHttpRequest();
	httpRequest.responseType = "json"
	httpRequest.onload = () => {
		if (httpRequest.status === 400) {
			// console.log(httpRequest.response);
			alert(httpRequest.response.error + ".  Please input a valid number and try again!");
		} else {
			console.log(httpRequest.response.result);
			createTable(httpRequest.response.result)
		}
		// if (httpRequest.readyState === httpRequest.DONE) {
		// 	if (httpRequest.status === 400) {
		// 		// console.log(httpRequest.response);
		// 		alert(httpRequest.response.error);
		// 	} else {
		// 		// createTable(httpRequest.response.result)
		// 	}
		// } else {
		// 	// maybe do something
		// }
	}
	httpRequest.open('POST', 'http://localhost:4321/query');
	httpRequest.setRequestHeader('Content-Type', 'application/json');
	httpRequest.send(JSON.stringify(roomQuery));
}

function createTable(resultArray) {
	let table = document.getElementById('roomQueryResult')

	for (let i = 0; i < resultArray.length; i++){
		let row = `<tr>
							<td>${resultArray[i].rooms_shortname}</td>
							<td>${resultArray[i].rooms_number}</td>
							<td>${resultArray[i].rooms_seats}</td>
							<td>${resultArray[i].rooms_href}</td>
					  </tr>`
		table.innerHTML += row
	}
}

function createRoomQuery(classSize) {
	let query = {
		"WHERE": {
			"AND": [
				{
					"IS": {
						"rooms_furniture": "*Tables*"
					}
				},
				{
					"GT": {
						"rooms_seats": classSize
					}
				}
			]
		},
		"OPTIONS": {
			"COLUMNS": [
				"rooms_shortname",
				"rooms_number",
				"rooms_seats",
				"rooms_href"
			]
		}
	};
	return query;
}

