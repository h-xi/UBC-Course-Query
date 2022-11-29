import InsightFacade from "../controller/InsightFacade";
import {IInsightFacade, InsightDatasetKind, InsightError,} from "../controller/IInsightFacade";
import {Request, Response} from "express";

const facade: IInsightFacade = new InsightFacade();

const addDatasetRouter = async (req: Request, res: Response) => {
	let data = req.body;
	let id = req.params.id;
	let datasetType = req.params.kind;
	let kind;
	try {
		if (datasetType === "rooms") {
			kind = InsightDatasetKind.Rooms;
		} else {
			kind = InsightDatasetKind.Sections;
		}
		const result = await facade.addDataset(id, data, kind);
		res.send(result);
	} catch (e: any) {
		res.status(400).json({
			error: e.message
		});
	}
};

const removeDatasetRouter = async (req: Request, res: Response) => {
	let id = req.params.id;
	try {
		const result = await facade.removeDataset(id);
		res.send(result);
	} catch (e: any) {
		res.status(400).json({error: e.message});
	}
};

const listDatasetRouter = async (req: Request, res: Response) => {
	try {
		const response = await facade.listDatasets();
		if (response.length === 0) {
			res.status(400).json({
				message: "No dataset added"
			});
		} else {
			res.send(response);
		}
	} catch (e: any) {
		res.status(400).json({error: e.message});
	}
};

export {addDatasetRouter, removeDatasetRouter, listDatasetRouter};
