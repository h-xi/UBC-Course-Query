import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError
} from "./IInsightFacade";

import jsZip from "jszip";
import fs from "fs-extra";
import path from "path";

interface MemoryDataSet {
	id: string,
	content: any []
}
const memDataset = {} as MemoryDataSet;
const addedDataSet: string [] = [];

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

/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	private addedDatasetID: string [] = [];
	private memDataset = {} as MemoryDataSet;
	constructor() {
		console.log("InsightFacadeImpl::init()");
	}

	public addDataset = async (id: string, content: string, kind: InsightDatasetKind): Promise<string[]> => {
		if (id.includes("_") || id === " ") {
			throw new InsightError("Invalid ID");
		}
		if (!fs.existsSync(path.join(__dirname, `../../data/${id}.json`))) {
			try {
				const courseArray = await this.processCourses(content);
				const numRows = this.findnumRows(courseArray);
				console.log(numRows);
				const memoryContent = this.createCourseMapping(id, courseArray);
				// const numRows = this.findnumRows(courseArray);
				// console.log(numRows);
				if (memDataset.id == null && memDataset.content == null) {
				  memDataset.id = id;
				  memDataset.content = memoryContent;
				}
				this.addedDatasetID.push(id);
				console.log(this.addedDatasetID);
				return this.addedDatasetID;
			  } catch (e) {
				console.log(e);
				throw new InsightError("Error saving dataset to disk");
			  }
		} else {
			  console.log("error! Dataset already exists");
			  throw new InsightError("Dataset already exists");
		}
	};

	public removeDataset(id: string): Promise<string> {
		return Promise.reject("Not implemented.");
	}

	public performQuery(query: unknown): Promise<InsightResult[]> {
		return Promise.reject("Not implemented.");
	}

	public listDatasets(): Promise<InsightDataset[]> {
		return Promise.reject("Not implemented.");
	}

	private processCourses = async (zipFile: string): Promise<any []> => {
		let toBeProcessed: Array<Promise<any>> = [];
		let processedFiles: any [] = [];
		return new Promise((fullfill, reject) => {
			jsZip.loadAsync(zipFile, {base64: true}).then((unzipped) => {
				for (let filePath in unzipped.files) {
					let file = unzipped.file(filePath);
					if (file) {
						toBeProcessed.push(file.async("string"));
					}
				}
				Promise.all(toBeProcessed).then((processed) => {
					for (let course of processed) {
						let JSONCourse = JSON.parse(course);
						processedFiles.push(JSONCourse);
					}
				})
					.catch((e) => reject({message: e}))
					.finally(() => {
						fullfill(processedFiles);
					});
			})
				.catch((e) => {
					reject(e);
				});
		});
	};

// if (filePath.match(`courses\/[^\.].*`)) {
//

	private createCourseMapping = (id: string, processedCourses: any []) => {
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
				course.uuid = result.id;
				if (result.Section === "overall") {
					course.year = 1900;
				} else {
					course.year = Number(result.Year);
				}
				courses.push(course);
		  });
		});
		console.log(courses[0]);
		this.saveToDisk(id, courses);
		return courses;
	  };

	private saveToDisk = (fileID: string, proccessedData: Course []) => {
		const stringData = JSON.stringify(proccessedData);
		fs.outputFileSync(path.join(__dirname, `../../data/${fileID}.json`), stringData);
	  };

	private findnumRows = (proccessedData: any []) => {
		let numRows = 0;
		proccessedData.forEach((section: any) => {
		  let result = section.result;
		  numRows += result.length;
		});
		return numRows;
	  };
}

