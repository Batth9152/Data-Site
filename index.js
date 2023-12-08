// Authors: Jaskaran Shergill, Austin Wang, and Shiming He
// Original Author: Austin Wang
// Date Modified: 2023-11-10
// Created to be able to be used with the new generation telementery and communication system
// Modified by Jaskaran Shergill
// Modification Information: Changed variables to same naming convention, fixed grammatical errors, added notification system, wrote more descriptive comments, rewrote functions with bad practices (future proofing), improved resource efficiency

// Set this value depending on the battery
var dataAhLeft = 0;
var totalAh = 0;
var remainingTime = 0;
var AhUsedMin = 0;
var predictTargetAh = 0;

// Data variables
var dataAh = 0; // Amp-hours
var dataV = 0; // Voltage
var dataA = 0; // Amperage
var dataS = 0; // Speed
var dataD = 0; // Distance

// Data calculation variables
var dataAhPast = 0;
var dataAhPastTotal = 0;
var dataAhTotal = 0;
var dataVTotal = 0;
var amountDataAdded = 0;

// Deprecated code - Kept incase of future use
const messagesSystemTop = document.getElementById("messagesSystem");
const messagesRawDataTop = document.getElementById("messagesRawData");
const messagesProcessedDataBottom = document.getElementById("messagesProcessedData");
const messagesAhLeftTop = document.getElementById("messagesAhLeft");

// PubNub Channel and Entry
const theChannel = "the_guide";
const theEntry = "Earth";

// Initialize the connection to the PubNub - define the keys and establish the connection
const pubnub = new PubNub({
	publishKey: "pub-c-f418f6ca-711a-402a-b373-fe542788cf3b",
	subscribeKey: "sub-c-3a2983ca-ce37-11ec-ab76-de5c934881d6",
	uuid: "theClientUUID", // *Whoever has worked on the Raspberry Pi Side of the PubNub, please fix/add the UUIDs*
});

pubnub.subscribe({
	channels: ["the_guide"],
	withPresence: true,
});

// Listen for new messages
pubnub.addListener({
	message: function (event) {
		var messageIn = event.message.update;
		var messageEntry = event.message.entry;

		if (messageIn == "PN Connected") {
			displaySystemMessage("[MESSAGE: received]", messageEntry + ": " + messageIn);
		} else if (messageIn == "Harmless.") {
			displaySystemMessage("[MESSAGE: received]", messageEntry + ": " + messageIn);
		} else {
			// Check to make sure the message is not sent from the computer (Houston), if it is then ignore the message
			if (messageEntry != "Houston") {
				onReceive(messageIn);
			}
		}
	},

	presence: function (event) {
		displaySystemMessage("[PRESENCE: " + event.action + "]", "uuid: " + event.uuid + ", channel: " + event.channel);
	},

	status: function (event) {
		displaySystemMessage("[STATUS: " + event.category + "]", "connected to channels: " + event.affectedChannels);

		if (event.category == "PNConnectedCategory") {
			submitUpdate(theEntry, "PN Connected");
		}
	},
});

// System updates
const submitUpdate = (anEntry, anUpdate) => {
	var web = {
        Destination: "Monitor",
		Type: "Receive/Send", // need to be updated
		TotalBattery : anUpdate.batteryTotalAh,
		Battery_percentage: "Float",
		Time: anUpdate.remainingTime,
		Max_time: getTime(),
		speed: anUpdate.dataS,
		Amps: anUpdate.dataA,
		Voltage: anUpdate.dataVTotal,
		Total_ahs: anUpdate.totalAh,
		Amp_hours: anUpdate.dataAh,

    };
	var phone = {
		Destination: "Phone",
		Type: "Receive",
		Battery_percentage: "Float",
		Time: anUpdate.remainingTime,
		speed: anUpdate.dataS,
		update_phone: {
		Max_time: getTime(),
		Total_ahs: anUpdate.totalAh,
		Amp_hours: anUpdate.dataAhLeft,
	  
	}};
	pubnub.publish(
		
		{
			channel: theChannel,
			message: {entry: anEntry, monitor: JSON.stringify(web), phone: JSON.stringify(phone), update: anUpdate},
		},
		function (status, response) {
			if (status.error) {
				console.log(status);
			} else {
				displaySystemMessage("[PUBLISH: sent]", "time: " + new Date((response.timetoken / 10000000) * 1000).toLocaleTimeString("en-US", {hour12: true}));
			}
		}
	);
};

// Create a notification everytime a system message is recieved.
const displaySystemMessage = (messageType, aMessage) => {
	// messageType = Title
	// aMessage = Message Content
	createNotification(messageType, aMessage, 5000); // Last argument is duration of notification in milliseconds
};

// Deprecated - Use in future if needed | Displays all the raw data that is sent from the PubNub
const displayRawDataIn = (lastIn) => {};

// Deprecated - Use in future if needed | Displays all the processed data that is sent from the PubNub
const displayProcessedDataIn = (lastIn) => {};

// Changes the AhLeft and Ah Used in the Past Minute values on the website (the 2 massive numbers)
const predictDataAhIn = (AhLeft, AhPastMin) => {
	document.getElementById("ah-left").textContent = AhLeft;
	document.getElementById("ah-pastmin").textContent = AhPastMin;
};

// Handle message receival
function onReceive(messageIn) {
	const messageArray = messageIn.trim().split(/\s+/);

	// Check what type of message it is
	if (messageArray.length >= 1 && messageArray[0] == "raw") {
		// Raw Message

		displayRawDataIn(messageIn);

		if (messageArray.length == 6 && messageArray[1] != "blank") {
			//Amp-hours
			dataAh = parseFloat(messageArray[1]);

			// Voltage
			dataVTotal = parseFloat(messageArray[2]);

			amountDataAdded++;
			if (amountDataAdded == 5) {
				dataV = dataVTotal;
				amountDataAdded = 0;
				dataVTotal = 0;
			}

			// Amperage
			dataA = parseFloat(messageArray[3]);

			// Speed
			dataS = parseFloat(messageArray[4]);

			// Distance
			dataD = parseFloat(messageArray[5]);
		}
	}

	if (messageArray.length == 6 && messageArray[0] == "prep") {
		// Processed Message

		displayProcessedDataIn(messageIn);

		// Total Ah
		totalAh = parseFloat(messageArray[1]);

		// Ah Left
		dataAhLeft = parseFloat(messageArray[2]);

		// Remaining Time
		remainingTime = parseFloat(messageArray[3]);

		AhUsedMin = parseFloat(messageArray[4]);
		predictTargetAh = parseFloat(messageArray[5]);
		predictDataAhIn(predictTargetAh, AhUsedMin);
	}
}

function getTime() {
	d = new Date();
	return d;
}

// Amp-hours vs. Time Graph
Plotly.plot(
	"chartAh",
	[
		{
			x: [getTime()],
			y: [dataAh],
			type: "line",
		},
	],
	{
		title: {
			text: "Amp-hours vs. Time",
		},
		xaxis: {
			title: {
				text: "Time",
			},
			type: "date",
		},
		yaxis: {
			title: {
				text: "Amp-hours (Ah)",
			},
		},
	}
);

// Voltage vs. Time Graph
Plotly.plot(
	"chartV",
	[
		{
			x: [getTime()],
			y: [dataV],
			type: "line",
		},
	],
	{
		title: {
			text: "Voltage vs. Time",
		},

		xaxis: {
			title: {
				text: "Time",
			},
			type: "date",
		},
		yaxis: {
			title: {
				text: "Voltage (V)",
			},
		},
	}
);

// Amperage vs. Time graph
Plotly.plot(
	"chartA",
	[
		{
			x: [getTime()],
			y: [dataA],
			type: "line",
		},
	],
	{
		title: {
			text: "Amperage vs. Time",
		},

		xaxis: {
			title: {
				text: "Time",
			},
			type: "date",
		},
		yaxis: {
			title: {
				text: "Amperage",
			},
		},
	}
);

// Speed vs. Time Graph
Plotly.plot(
	"chartS",
	[
		{
			x: [getTime()],
			y: [dataS],
			type: "line",
		},
	],
	{
		title: {
			text: "Speed vs. Time",
		},

		xaxis: {
			title: {
				text: "Time",
			},
			type: "date",
		},
		yaxis: {
			title: {
				text: "Speed",
			},
		},
	}
);

// Distance vs. Time Graph
Plotly.plot(
	"chartD",
	[
		{
			x: [getTime()],
			y: [dataD],
			type: "line",
		},
	],
	{
		title: {
			text: "Distance vs. Time",
		},

		xaxis: {
			title: {
				text: "Time",
			},
			type: "date",
		},
		yaxis: {
			title: {
				text: "D3",
			},
		},
	}
);

// Total Ah vs. Time Graph
Plotly.plot(
	"chartTotalAh",
	[
		{
			x: [getTime()],
			y: [totalAh],
			type: "line",
		},
	],
	{
		title: {
			text: "Total Ah vs. Time",
		},

		xaxis: {
			title: {
				text: "Time",
			},
			type: "date",
		},
		yaxis: {
			title: {
				text: "Ah",
			},
		},
	}
);

/* Ah used in last minute vs. Time Graph */
Plotly.plot(
	"chartAhMin",
	[
		{
			x: [getTime()],
			y: [totalAh],
			type: "line",
		},
	],
	{
		title: {
			text: "Ah used in last min vs. Time",
		},

		xaxis: {
			title: {
				text: "Time",
			},
			type: "date",
		},
		yaxis: {
			title: {
				text: "Ah/min",
			},
		},
	}
);

// Seperate intervals are used to make the graphs generate indepentantly, without interference from eachother. (Faster and more efficient graph times) However, this is more resource heavy.
// Test and evaluate this method. If using this method is found to slow down the chromebooks (or whatever device is being used), then switch to generating all the graphs on a single interval.
setInterval(() => {
	Plotly.extendTraces("chartAh", {x: [[getTime()]], y: [[dataAh]]}, [0]);
}, 1000);

setInterval(() => {
	Plotly.extendTraces("chartV", {x: [[getTime()]], y: [[dataV]]}, [0]);
}, 1000);

setInterval(() => {
	Plotly.extendTraces("chartA", {x: [[getTime()]], y: [[dataA]]}, [0]);
}, 1000);

setInterval(() => {
	Plotly.extendTraces("chartS", {x: [[getTime()]], y: [[dataS]]}, [0]);
}, 1000);

setInterval(() => {
	Plotly.extendTraces("chartD", {x: [[getTime()]], y: [[dataD]]}, [0]);
}, 1000);

setInterval(() => {
	Plotly.extendTraces("chartTotalAh", {x: [[getTime()]], y: [[totalAh]]}, [0]);
}, 1000);

setInterval(() => {
	Plotly.extendTraces("chartAhMin", {x: [[getTime()]], y: [[totalAh]]}, [0]);
}, 1000);

// Push the messages to the Raspberry Pi
// Start the race - Retrieve and set the battery Ah and time
const startRace = () => {
	var batteryTotalAh = document.getElementById("battery-total").value;
	var totalTimeVal = document.getElementById("total-ah-input").value;
	var outputString = {Battery: batteryTotalAh, Time: totalTimeVal};

	submitUpdate("Houston", outputString);
};

// Update the remaining time
const updateTime = () => {
	var totalTimeVal = document.getElementById("total-ah-input").value;
	var outputString = {Time: totalTimeVal};

	submitUpdate("Houston", outputString);
};

// Send the target Ah per min expenditure
const sendTarget = () => {
	var targetAh = document.getElementById("target-val").value;
	submitUpdate("Houston", {Target: targetAh});
	//test

	predictDataAhIn(0, 10);
};

// Set which prediction mode the Raspberry Pi is in.

// Automatic
const autoModeSet = () => {
	var predictionMode = "auto";
	submitUpdate("Houston", {"Prediction Mode": predictionMode});
};

// Semi-automatic
const semiAutoModeSet = () => {
	var predictionMode = "semi-auto";
	submitUpdate("Houston", {"Prediction Mode": predictionMode});
};

// Manual
const manModeSet = () => {
	var predictionMode = "man";
	submitUpdate("Houston", {"Prediction Mode": predictionMode});
};

// Send speed signals for MANUAL MODE
const sendSignalSlower = () => {
	var sendSignalMode = "Slow Down";
	submitUpdate("Houston", {"Speed Signal": sendSignalMode});
};

const sendSignalOnspeed = () => {
	var sendSignalMode = "Center";
	submitUpdate("Houston", {"Speed Signal": sendSignalMode});
};

const sendSignalFaster = () => {
	var sendSignalMode = "Speed Up";
	submitUpdate("Houston", {"Speed Signal": sendSignalMode});
};

// System to create notifications
const createNotification = (title, message, duration) => {
	const notificationContainer = document.getElementById("notification-container");

	const notification = document.createElement("div");
	notification.className = "notification";

	const closeBtn = document.createElement("span");
	closeBtn.className = "close";
	closeBtn.innerHTML = "Ｘ";
	closeBtn.onclick = () => {
		notification.remove();
	};

	const titleNode = document.createElement("div");
	titleNode.className = "title";
	titleNode.appendChild(document.createTextNode(title));

	const messageNode = document.createTextNode(message);

	notification.appendChild(titleNode);
	notification.appendChild(messageNode);
	notification.appendChild(closeBtn);

	const timeBar = document.createElement("div");
	timeBar.id = "time-bar";

	const timeLeft = document.createElement("div");
	timeLeft.id = "time-left";

	timeBar.appendChild(timeLeft);

	notification.appendChild(timeBar);

	notificationContainer.appendChild(notification);

	setTimeout(() => {
		notification.remove();
	}, duration);

	let startTime = Date.now();
	const updateProgressBar = () => {
		const elapsedTime = Date.now() - startTime;
		const percentage = ((duration - elapsedTime) / duration) * 100;
		timeLeft.style.width = percentage + "%";

		if (percentage > 0) {
			requestAnimationFrame(updateProgressBar);
		}
	};

	requestAnimationFrame(updateProgressBar);
};
