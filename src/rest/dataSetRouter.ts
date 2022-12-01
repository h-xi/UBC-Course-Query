import InsightFacade from "../controller/InsightFacade";
import {
	IInsightFacade, InsightDatasetKind, InsightError,
	ResultTooLargeError, InsightResult, NotFoundError
} from "../controller/IInsightFacade";
import {Request, Response} from "express";

const facade: IInsightFacade = new InsightFacade();

const addDatasetRouter = async (req: Request, res: Response) => {
	let data = req.body;
	let id = req.params.id;
	let datasetType = req.params.kind.toLowerCase();
	console.log(datasetType);
	if (Object.keys(data).length === 0) {
		return res.status(400).json({error: "Please provide dataset file"});
	}
	if (datasetType === "rooms" || datasetType === "sections") {
		let kind;
		if (datasetType === "rooms") {
			kind = InsightDatasetKind.Rooms;
		} else {
			kind = InsightDatasetKind.Sections;
		}
		try {
			data = new Buffer(data).toString("base64");
			const result = await facade.addDataset(id, data, kind);
			return res.status(200).json({result: result});
		} catch (e: any) {
			return res.status(400).json({
				error: e.message
			});
		}
	} else {
		res.status(400).send({error: "Invalid dataset Type"});
	};
};

const removeDatasetRouter = async (req: Request, res: Response) => {
	let id = req.params.id;
	try {
		const result = await facade.removeDataset(id);
		return res.status(200).json({result: result});
	} catch (e: any) {
		if (e instanceof NotFoundError) {
			return res.status(404).json({error: e.message});
		}
		return res.status(400).json({error: e.message});
	}
};

const listDatasetRouter = async (req: Request, res: Response) => {
	try {
		const response = await facade.listDatasets();
		return res.status(200).json({result: response});
	} catch (e: any) {
		return res.status(400).json({error: e.message});
	}
};

const postHandler = (req: Request, res: Response) => {
	// console.log(`Server::postHandler(..) - params: ${JSON.stringify(req.body)}`);
	facade.performQuery(req.body).then(function(queryResult: InsightResult[]) {
		res.status(200).json({result: queryResult});
	}).catch(function (queryError: InsightError | ResultTooLargeError) {
		res.status(400).json({error: queryError.message});
	});
};

export {addDatasetRouter, removeDatasetRouter, listDatasetRouter, postHandler};
