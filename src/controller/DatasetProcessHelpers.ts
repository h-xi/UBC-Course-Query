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

const getBuildingName = (res: string [], node: any, nodeNameOne: string, nodeNameTwo: string) => {
	if (!node.childNodes) {
		return;
	};
	if (node.nodeName === nodeNameOne) {
		for (let num in node.childNodes) {
			if (node.childNodes[num].nodeName === nodeNameTwo) {
				let filePath = node.childNodes[num].childNodes[9].childNodes[1].attrs[0].value.split("./");
				res.push(filePath[1]);
			}
		}
		return;
	}
	for (let num in node.childNodes) {
		getBuildingName(res, node.childNodes[num], nodeNameOne, nodeNameTwo);
	}
};

const processRooms = async (zipFile: string): Promise<any[]> => {
	return new Promise((fullfill, reject) => {
		jsZip.loadAsync(zipFile, {base64: true}).then((unzipped) => {
			findValidBuildings(unzipped).then((buildings) => {
				console.log(buildings);
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

const findValidBuildings = async (content: any) => {
	const validBuildings: string[] = [];
	try {
		if ("index.htm" in content.files) {
			const index = await content.file("index.htm").async("string");
			const document = parse(index);
			getBuildingName(validBuildings, document, "tbody", "tr");
			console.log(validBuildings);
			return validBuildings;
		}
	} catch (e) {
		console.log(e);
	}
};

export {processCourses, createCourseMapping, findNumRows};
