import fs from "fs-extra";
import path from "path";
import jsZip from "jszip";
import {parse} from "parse5";

interface Course {
	dept: string,
	id: string,
	avg: number,
	instructor: string,
	title: string,
	pass: number,
	fail: number,
	audit: string,
	uuid: number,
	year: number
}
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
};

const createRoomMapping = (node: any, buildingShortName: string) => {
	let room = {} as Rooms;
	getBuildingInfo(node, room, buildingShortName);
	// TODO: Call fns that retrieve information for object
	return room;
};

const createCourseMapping = (id: string, processedCourses: any []): Course [] => {
	const courses: any [] = [];
	const validCourses = processedCourses.filter((obj) => obj.result.length > 0);
	validCourses.forEach((section) => {
	  let sectionResult = section.result;
	  sectionResult.forEach((result: any) => {
			let course = {} as Course;
			course.dept = result.Subject;
			course.id = result.Course;
			course.avg = result.Avg;
			course.instructor = result.Professor;
			course.title = result.Title;
			course.pass = result.Pass;
			course.fail = result.Fail;
			course.audit = result.Audit;
			course.uuid = result.id.toString();
			if (result.Section === "overall") {
				course.year = 1900;
			} else {
				course.year = Number(result.Year);
			}
			courses.push(course);
	  });
	});
	console.log(courses[0]);
	saveToDisk(id, courses);
	return courses;
};

const processRooms = async (zipFile: string): Promise<any[]> => {
	let toBeProcessed: Array<Promise<any>> = [];
	return new Promise((fullfill, reject) => {
		jsZip.loadAsync(zipFile, {base64: true}).then((unzipped) => {
			findValidBuildings(unzipped).then((buildings) => {
				for (let num in buildings) {
					let file = unzipped.file(buildings[num][0]);
					if (file) {
						toBeProcessed.push(file.async("string"));
					}
				}
				Promise.all(toBeProcessed).then((processed) => {
					for (let num in processed) {
						let room = parse(processed[num]);
						createRoomMapping(room, buildings[num][1]);
					}
				});
				// process all buildings in path into mapped data struct
			});
		});
	});
};

const processCourses = async (zipFile: string): Promise<any []> => {
	let toBeProcessed: Array<Promise<any>> = [];
	let processedFiles: any [] = [];
	return new Promise((fullfill, reject) => {
		jsZip.loadAsync(zipFile, {base64: true}).then((unzipped) => {
			for (let filePath in unzipped.files) {
				if (!filePath.includes("courses/")) {
					reject("invalid Dataset");
				}
				let file = unzipped.file(filePath);
				if (file) {
					toBeProcessed.push(file.async("string"));
				}
			}
			Promise.all(toBeProcessed).then((processed) => {
				for (let course of processed) {
					try {
						let JSONCourse = JSON.parse(course);
						processedFiles.push(JSONCourse);
					} catch(e) {
						continue;
					}
				}
			})
				.catch((e) => reject({message: e}))
				.finally(() => {
					fullfill(processedFiles);
				});
		}).catch((e) => {
			reject(e);
		});
	});
};

const saveToDisk = (fileID: string, processedData: Course []) => {
	const stringData = JSON.stringify(processedData);
	fs.outputFileSync(path.join(__dirname, `../../data/${fileID}.json`), stringData);
};

const findNumRows = (processedData: any []) => {
	let numRows = 0;
	processedData.forEach((section) => {
	  let result = section.result;
	  numRows += result.length;
	});
	return numRows;
};

const createBuildingDirectory = (res: string [][], node: any) => {
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

const findValidBuildings = async (content: any): Promise<string [][]> => {
	const validBuildings: string[][] = [];
	return new Promise((fullfill, reject) => {
		if ("index.htm" in content.files) {
			content.file("index.htm").async("string").then((index: any) => {
				const document = parse(index);
				createBuildingDirectory(validBuildings, document);
				fullfill(validBuildings);
			}).catch((e: any) => {
				console.log(e);
				reject(e);
			});
		}
	});
};

const getBuildingInfo = (node: any, room: Rooms, buildingShortName: string) => {
	let content: any[] = [];
	getNodeInfo(content, node, "field-content");
	room.fullname = content[0].childNodes[0].value;
	room.shortname = buildingShortName;
	room.address = content[1].childNodes[0].value;
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

export {processCourses, createCourseMapping, findNumRows};
