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
	private addedDatasetID: any [] = [];
	constructor() {
		console.log("InsightFacadeImpl::init()");
	}

	public addDataset = async (id: string, content: string, kind: InsightDatasetKind): Promise<string[]> => {
		if (!fs.existsSync(path.join(__dirname, `../../data/${id}.json`))) {
			try {
				const courseArray = await this.processCourses(content);
				const memoryContent = await this.createCourseMapping(id, courseArray);
				const numRows = this.findnumRows(courseArray);
				console.log(numRows);
				if (memDataset.id == null && memDataset.content == null) {
				  memDataset.id = id;
				  memDataset.content = memoryContent;
				}
				this.addedDatasetID.push(id);
				return addedDataSet;
			  } catch (e) {
				console.log(e);
				throw new Error("Error saving dataset to disk");
			  }
		} else {
			  console.log("error! Dataset already exists");
			  throw new Error("dataset already exists");
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

	private processCourses = async (zipFile: string) => {
		const zip = await jsZip.loadAsync(zipFile, {base64: true});
		let toBeProcessed: any[] = [];
		let processed: object[] = [];
		for (let filePath in zip.files) {
			console.log(filePath);
			// if (filePath.match(`courses\/[^\.].*`)) {
			let file = zip.file(filePath);
			if (file) {
				file.async("string").then((fileString) => {
					toBeProcessed.push(fileString);
				}).catch((e) => {
					throw new InsightError(e);
				});
			} else {
				throw new InsightError("Dataset with provided ID already exists");
			}
			// }
		}
		for (let dataFile of toBeProcessed) {
			// console.log(dataFile);
			let jsonObject = JSON.parse(dataFile); // parse course if defined
			// console.log(jsonObject);
			processed.push(jsonObject);
		}
		return processed;
	};

	private createCourseMapping = async (id: string, processedCourses: any []) => {
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
		this.saveToDisk(id, courses);
		return courses;
	  };

	private saveToDisk = (fileID: string, proccessedData: any []) => {
		const stringData = JSON.stringify(proccessedData);
		fs.writeFileSync(path.join(__dirname, `../../data/${fileID}.json`), stringData);
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

