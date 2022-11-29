import InsightFacade from "../controller/InsightFacade";
import {IInsightFacade, InsightDatasetKind, InsightError,} from "../controller/IInsightFacade";
import {Request, Response} from "express";

const facade: IInsightFacade = new InsightFacade();

const addDatasetRouter = async (req: Request, res: Response) => {
	let data = req.body;
	let id = req.params.id;
	let datasetType = req.params.kind;
	if (Object.keys(data).length === 0) {
		return res.status(400).json({error: "Please provide dataset file"});
	}
	if (datasetType !== ("rooms" || "sections")) {
		return res.status(400).json({error: "Invalid dataset Type"});
	}

	let kind;
	if (datasetType === "rooms") {
		kind = InsightDatasetKind.Rooms;
	} else {
		kind = InsightDatasetKind.Sections;
	}
	try {
		const result = await facade.addDataset(id, data, kind);
		return res.send(result);
	} catch (e: any) {
		return res.status(400).json({
			error: e.message
		});
	}
};

const removeDatasetRouter = async (req: Request, res: Response) => {
	let id = req.params.id;
	try {
		const result = await facade.removeDataset(id);
		return res.send(result);
	} catch (e: any) {
		return res.status(400).json({error: e.message});
	}
};

const listDatasetRouter = async (req: Request, res: Response) => {
	try {
		const response = await facade.listDatasets();
		return res.send(response);
	} catch (e: any) {
		return res.status(400).json({error: e.message});
	}
};

export {addDatasetRouter, removeDatasetRouter, listDatasetRouter};
