import { getBehaviorClassification, getBehaviorSummary } from "@/utils/behaviorClassification";

export async function POST(req) {
	try {
		const { participantId, eventId, action } = await req.json();

		if (!participantId && !eventId) {
			return Response.json(
				{ error: "Missing participantId or eventId" },
				{ status: 400 }
			);
		}

		if (action === "summary" && eventId) {
			// Get behavior summary for an event
			const summary = await getBehaviorSummary(eventId);
			return Response.json(summary);
		}

		if (participantId) {
			// Get behavior classification for a specific participant
			const classification = await getBehaviorClassification(participantId);
			return Response.json(classification);
		}

		return Response.json(
			{ error: "Invalid action or missing parameters" },
			{ status: 400 }
		);
	} catch (error) {
		console.error("Error in behavior classification API:", error);
		return Response.json(
			{
				error: "Failed to calculate behavior classification",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}

export async function GET(req) {
	try {
		const { searchParams } = new URL(req.url);
		const participantId = searchParams.get("participantId");
		const eventId = searchParams.get("eventId");
		const action = searchParams.get("action");

		if (!participantId && !eventId) {
			return Response.json(
				{ error: "Missing participantId or eventId" },
				{ status: 400 }
			);
		}

		if (action === "summary" && eventId) {
			// Get behavior summary for an event
			const summary = await getBehaviorSummary(eventId);
			return Response.json(summary);
		}

		if (participantId) {
			// Get behavior classification for a specific participant
			const classification = await getBehaviorClassification(participantId);
			return Response.json(classification);
		}

		return Response.json(
			{ error: "Invalid action or missing parameters" },
			{ status: 400 }
		);
	} catch (error) {
		console.error("Error in behavior classification API:", error);
		return Response.json(
			{
				error: "Failed to calculate behavior classification",
				details: error instanceof Error ? error.message : "Unknown error",
			},
			{ status: 500 }
		);
	}
}
