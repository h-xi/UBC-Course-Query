import jsZip from "jszip";
import {parse} from "parse5";
import {Document} from "parse5/dist/tree-adapters/default";
import request from "node:http";
import {saveToDisk} from "./CourseDataProcessHelpers";

interface Rooms {
	fullname: string,
	shortname: string,
	number: string,
	name: string,
	address: string,
	lat: number
	lon: number,
	seats: number,
	type: string,
	furniture: string,
	href: string
}

interface Buildings {
	fullname: string,
	shortname: string,
	address: string,
	lat: number,
	lon: number,
}

const processRooms = async (id: string, zipFile: string): Promise<any[]> => {
	let roomsObjectList: Rooms[] = [];
	let toBeProcessed: Array<Promise<any>> = [];
	let validBuildings: Array<Promise<any>> = [];
	try {
		const index = await jsZip.loadAsync(zipFile, {base64: true});
		const buildingDirectory = await findValidBuildings(index);

		for (let num in buildingDirectory) {
			let file = index.file(buildingDirectory[num][0]);
			if (file) {
				toBeProcessed.push(file.async("string"));
			}
		}
		return new Promise((fulfill, reject) => {
			Promise.all(toBeProcessed).then((processed) => {
				for (let num in processed) {
					let building = parse(processed[num]);
					if (doesBuildingHaveRoom(building)) {
						validBuildings.push(
							createRoomMapping(
								building,
								roomsObjectList,
								buildingDirectory[num][1]
							)
						);
					}
				}
				Promise.all(validBuildings).then(() => {
					for (let num in roomsObjectList) {
              	if (
               	 	roomsObjectList[num].lat === Number.POSITIVE_INFINITY &&
                	roomsObjectList[num].lon === Number.POSITIVE_INFINITY
             	 ) {
              	  roomsObjectList.splice(Number(num), 1);
             	 }
					}
					saveToDisk(id, roomsObjectList);
					fulfill(roomsObjectList);
         	 });
			}).catch((e) => {
				console.error(e);
				reject(e);
			});
   	 });
	} catch (e) {
		console.log(e);
   	 throw new Error();
 	 }
};
const findValidBuildings = async (content: any): Promise<string [][]> => {
	const validBuildings: string[][] = [];
	return new Promise((fullfill, reject) => {
		if ("index.htm" in content.files) {
			content.file("index.htm").async("string").then((index: any) => {
				const document = parse(index);
				createBuildingDirectory(validBuildings, document);
				fullfill(validBuildings);
			}).catch((e: any) => {
				console.error(e);
				reject(e);
			});
		} else {
			reject();
		}
	});
};
const createBuildingDirectory = (res: string[][], node: any) => {
	if (!node.childNodes) {
		return;
	};
	if (node.nodeName === "tbody") {
		for (let num in node.childNodes) {
			if (node.childNodes[num].nodeName === "tr") {
				let filePath = node.childNodes[num].childNodes[9].childNodes[1].attrs[0].value.split("./");
				let shortName = filePath[1].split("/")[3].split(".")[0];

				res.push([filePath[1], shortName]);
			}
		}
		return;
	}
	for (let num in node.childNodes) {
		createBuildingDirectory(res, node.childNodes[num]);
	}
};
const doesBuildingHaveRoom = (building: Document) => {
	let content: any[] = [];
	getNodeInfo(content, building, "views-table cols-5 table");
	if (content.length !== 0) {
		return true;
	}
	return false;
};
const getNodeInfo = (content: any [], node: any, nodeName: string) => {
	if (!node.childNodes) {
		return;
	}
	for (let num in node.attrs) {
		if (node.attrs[num].value === nodeName) {
			content.push(node);
		}
	}
	for (let num in node.childNodes) {
		getNodeInfo(content, node.childNodes[num], nodeName);
	}
};

const createRoomMapping = async (node: Document, roomsObjectList: any, buildingShortName: string) => {
	let roomNum: string[] = [];
  	let roomFurniture: string[] = [];
  	let roomSeat: string[] = [];
	let roomType: string[] = [];
  	let roomLinks: string[] = [];
  	const table = findRoomTable(node);
	let building = await getBuildingInfo(node, buildingShortName);

  	getRoomNumbers(table, roomNum);
  	getRoomInfo(
    	table,
    	roomFurniture,
    	"views-field views-field-field-room-furniture"
  	);
  	getRoomInfo(table, roomSeat, "views-field views-field-field-room-capacity");
  	getRoomInfo(table, roomType, "views-field views-field-field-room-type");
  	getRoomLinks(table, roomLinks);
  	mapRoom(
    	roomsObjectList,
    	building,
    	roomNum,
    	roomSeat,
    	roomType,
    	roomFurniture,
    	roomLinks
  	);
};
const findRoomTable = (node: Document) => {
  	let content: any[] = [];
  	getNodeInfo(content, node, "views-table cols-5 table");
  	return content[0].childNodes[3];
};
const getBuildingInfo = async (node: any, buildingShortName: string): Promise<Buildings> => {
	let building = {} as Buildings;
	let content: any[] = [];
	getNodeInfo(content, node, "field-content");
	if (content.length !== 0) {
		building.fullname = content[0].childNodes[0].value;
		building.shortname = buildingShortName;
		building.address = content[1].childNodes[0].value;
		const coordinates: any = await getBuildingCoordinates(content[1].childNodes[0].value);
		if ("lat" in coordinates) {
			building.lat = Number(coordinates.lat);
			building.lon = Number(coordinates.lon);
		} else {
			building.lat = Number.POSITIVE_INFINITY;
			building.lon = Number.POSITIVE_INFINITY;
		}
	}
	return building;
};

const getBuildingCoordinates = async (address: string) => {
  	return new Promise((fullfill, reject) => {
    	const urlParam = address.replace(/ /g, "%20");
    	let parsed = {};
    	request.get(
      	`http://cs310.students.cs.ubc.ca:11316/api/v1/project_team188/${urlParam}`,
      	(res) => {
       	 let data = "";

        	res.on("data", (chunk) => {
          	data += chunk;
        	});

        	res
          	.on("end", () => {
            	try {
              	parsed = JSON.parse(data);
              	fullfill(parsed);
            	} catch (e) {
              	reject(e);
           	 }
         	 })
         	 .on("error", (e) => {
           	 reject(e);
         	 });
 	     }
  	  );
	  });
};

const getRoomNumbers = (node: Document, roomNum: string[]) => {
	let nodes: any [] = [];
  	getNodeInfo(nodes, node, "views-field views-field-field-room-number");
  	for (let num in nodes) {
    	roomNum.push(nodes[num].childNodes[1].childNodes[0].value);
  	}
};

const getRoomInfo = (node: Document, content: string [], attr: string) => {
  	let nodes: any [] = [];
  	getNodeInfo(nodes, node, attr);
  	for (let num in nodes) {
    	content.push(nodes[num].childNodes[0].value.trim());
  	}
};
const getRoomLinks = (node: Document, content: string []) => {
  	let nodes: any [] = [];
	getNodeInfo(nodes, node, "views-field views-field-nothing");
  	for (let num in nodes) {
    	content.push(nodes[num].childNodes[1].attrs[0].value);
  	}
};

const mapRoom = (roomsObjectList: any[], building: any, roomNum: string[],
	roomSeat: string[], roomType: string[],
	roomFurniture: string[], roomLinks: string[]) => {
	if (
		roomNum.length === roomType.length &&
		roomNum.length === roomLinks.length &&
		roomType.length === roomLinks.length
	) {
		for (let num in roomNum) {
			let room = {} as Rooms;
			room.fullname = building.fullname;
			room.shortname = building.shortname;
			room.address = building.address;
			room.lat = building.lat;
			room.lon = building.lon;
			room.number = roomNum[num];
			room.name = building.shortname + "_" + roomNum[num];
			room.seats = Number(roomSeat[num]);
			room.furniture = roomFurniture[num];
			room.href = roomLinks[num];
			room.type = roomType[num];
			roomsObjectList.push(room);
		}
	}
};

export {processRooms};
