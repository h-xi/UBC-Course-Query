import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError
} from "./IInsightFacade";

import {processCourses, createCourseMapping} from "./courseHelpers";
import fs from "fs-extra";
import path from "path";

interface MemoryDataSet {
	id: string,
	content: any []
}
const memDataset = {} as MemoryDataSet;

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
		if (id.includes("_") || id.trim().length === 0) {
			throw new InsightError("Invalid ID");
		}
		if (!fs.existsSync(path.join(__dirname, `../../data/${id}.json`))) {
			try {
				const courseArray = await processCourses(content);
				const numRows = this.findnumRows(courseArray);
				console.log(numRows);
				const memoryContent = createCourseMapping(id, courseArray);
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
		return new Promise((fullfill, reject) => {
			if (id.includes("_") || id.trim().length === 0) {
				reject(new InsightError("Invalid ID"));
			}
			if (!fs.existsSync(path.join(__dirname, `../../data/${id}.json`))) {
				reject(new NotFoundError());
			}
			try {
				console.log(this.addedDatasetID);
				fs.removeSync(path.join(__dirname, `../../data/${id}.json`));
				this.addedDatasetID = this.addedDatasetID.filter((e) => e !== id);
				console.log(this.addedDatasetID);
				fullfill("success");
			} catch(e){
				reject(e);
			};
		});
	};


	public performQuery(query: unknown): Promise<InsightResult[]> {
		return Promise.reject("Not implemented.");
	}

	public listDatasets(): Promise<InsightDataset[]> {
		return Promise.reject("Not implemented.");
	}

// if (filePath.match(`courses\/[^\.].*`)) {

	private findnumRows = (proccessedData: any []) => {
		let numRows = 0;
		proccessedData.forEach((section: any) => {
		  let result = section.result;
		  numRows += result.length;
		});
		return numRows;
	  };
}

