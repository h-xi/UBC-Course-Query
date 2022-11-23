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

const saveToDisk = (fileID: string, processedData: any []) => {
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

export {processCourses, createCourseMapping, findNumRows, saveToDisk};
