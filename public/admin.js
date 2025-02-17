import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, getDocs, doc, setDoc, query, orderBy, onSnapshot, getDoc, where, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 🔹 Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyBK3jFdXbfHqV43kn3hzE1TA9-zt3jt180",
    authDomain: "republican-party-voting-system.firebaseapp.com",
    projectId: "republican-party-voting-system",
    storageBucket: "republican-party-voting-system.appspot.com",
    messagingSenderId: "834541676093",
    appId: "1:834541676093:web:bf0eafa5e0f9ba68e0ec54",
    measurementId: "G-THQJN6HYQD"
};

// 🔹 Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ✅ Load Election History with Sorting
window.loadElectionHistory = async function () {
    const electionTable = document.getElementById("electionHistory");
    electionTable.innerHTML = "";

    try {
        const electionsSnapshot = await getDocs(query(collection(db, "elections"), orderBy("startTime", "desc")));
        electionsSnapshot.forEach((doc) => {
            const data = doc.data();
            const row = document.createElement("tr");

            const nameCell = document.createElement("td");
            nameCell.textContent = data.electionID;

            const startTimeCell = document.createElement("td");
            startTimeCell.textContent = new Date(data.startTime.seconds * 1000).toLocaleString();

            const endTimeCell = document.createElement("td");
            endTimeCell.textContent = data.endTime ? new Date(data.endTime.seconds * 1000).toLocaleString() : "Ongoing";

            row.appendChild(nameCell);
            row.appendChild(startTimeCell);
            row.appendChild(endTimeCell);

            electionTable.appendChild(row);
        });
    } catch (error) {
        console.error("Error loading election history:", error);
    }
};

// ✅ Start a New Election with Verification
window.startElection = async function () {
    const electionName = document.getElementById("electionName").value.trim();
    const roundNumber = parseInt(document.getElementById("roundNumber").value.trim());
    if (!electionName) {
        alert("Please enter an election name.");
        return;
    }

    try {
        const existingElection = await getActiveElection();
        if (existingElection) {
            await stopActiveElection();
        }

        const newElectionID = `${electionName} - Round ${roundNumber}`;
        
        // Store the election
        await setDoc(doc(db, "elections", newElectionID), {
            electionID: newElectionID,
            round: roundNumber,
            active: true,
            startTime: new Date().toISOString()
        });

        // Verify the update
        console.log("Verifying election update in Firebase...");
        const verificationDoc = await getDoc(doc(db, "elections", newElectionID));
        
        if (verificationDoc.exists()) {
            const verifiedData = verificationDoc.data();
            console.log("Verification Results:");
            console.log("Expected Election ID:", newElectionID);
            console.log("Stored Election ID:", verifiedData.electionID);
            console.log("Active Status:", verifiedData.active);
            console.log("Round Number:", verifiedData.round);
            
            if (verifiedData.electionID === newElectionID && 
                verifiedData.active === true && 
                verifiedData.round === roundNumber) {
                console.log("✅ Election successfully verified in Firebase!");
                alert(`New Election Started and Verified: ${newElectionID}`);
            } else {
                console.error("❌ Election verification failed - data mismatch!");
                alert("Warning: Election started but verification showed inconsistent data.");
            }
        } else {
            console.error("❌ Election verification failed - document not found!");
            alert("Error: Election creation could not be verified!");
        }

        loadElectionHistory();
    } catch (error) {
        console.error("Error starting/verifying election:", error);
        alert("Failed to start election: " + error.message);
    }
};

// ✅ Stop Active Election
window.stopActiveElection = async function () {
    const electionID = await getLatestElectionID();
    console.log("Stopping Election ID:", electionID);

    if (electionID === "UNKNOWN_ELECTION") {
        alert("No active election found.");
        return;
    }

    try {
        // Step 1: Fetch voting results
        const candidateSnapshot = await getDocs(collection(db, "candidates"));
        let totalVotes = 0;
        let candidateResults = [];

        candidateSnapshot.forEach((doc) => {
            const data = doc.data();
            totalVotes += data.votes || 0;
            candidateResults.push({
                name: data.name,
                votes: data.votes || 0,
                percentage: totalVotes > 0 ? ((data.votes / totalVotes) * 100).toFixed(2) : "0.00"
            });
        });

        // Step 2: Fetch votes log
        const votesQuery = query(collection(db, "votes"), where("electionID", "==", electionID));
        const votesSnapshot = await getDocs(votesQuery);
        const votesData = [];

        votesSnapshot.forEach(doc => {
            const vote = doc.data();
            let readableTimestamp = "Unknown Time";

            if (vote.timestamp) {
                try {
                    readableTimestamp = vote.timestamp.toDate().toLocaleString();
                } catch (error) {
                    console.warn("Invalid timestamp:", vote);
                }
            }

            votesData.push({
                confirmationNumber: vote.confirmationNumber,
                candidate: vote.candidate,
                timestamp: readableTimestamp
            });
        });

        // Step 3: Create Excel Workbook
        const wb = XLSX.utils.book_new();

        // **Sheet 1: Voting Results**
        const resultsData = [["Candidate", "Votes", "Percentage"]];
        candidateResults.forEach(({ name, votes, percentage }) => {
            resultsData.push([name, votes, `${percentage}%`]);
        });
        const resultsSheet = XLSX.utils.aoa_to_sheet(resultsData);
        XLSX.utils.book_append_sheet(wb, resultsSheet, "Voting Results");

        // **Sheet 2: Vote Log**
        const votesLogData = [["Confirmation Number", "Candidate", "Timestamp"]];
        votesData.forEach(({ confirmationNumber, candidate, timestamp }) => {
            votesLogData.push([confirmationNumber, candidate, timestamp]);
        });
        const votesLogSheet = XLSX.utils.aoa_to_sheet(votesLogData);
        XLSX.utils.book_append_sheet(wb, votesLogSheet, "Vote Log");

        // **Download Excel File**
        XLSX.writeFile(wb, `Election_Results_${electionID}.xlsx`);

        // Step 4: Save election results to Firestore
        await setDoc(doc(db, "election_results", electionID), { votes: votesData.length > 0 ? votesData : [] });

        // Step 5: Reset all voter 'used' field to false
        const votersQuery = query(collection(db, "voters"), where("used", "==", true));
        const votersSnapshot = await getDocs(votersQuery);
        const batchResetVoters = writeBatch(db);

        votersSnapshot.forEach((voterDoc) => {
            batchResetVoters.update(doc(db, "voters", voterDoc.id), { used: false });
        });
        await batchResetVoters.commit();

        // Step 6: Reset all candidate votes to 0
        const batchResetCandidates = writeBatch(db);
        candidateSnapshot.forEach((candidateDoc) => {
            batchResetCandidates.update(doc(db, "candidates", candidateDoc.id), { votes: 0 });
        });
        await batchResetCandidates.commit();

        // Step 7: Mark election as inactive
        const electionRef = doc(db, "elections", electionID);
        await updateDoc(electionRef, { active: false, endTime: new Date().toISOString() });

        alert(`Election "${electionID}" has been stopped. Results saved.`);

        loadElectionHistory();
    } catch (error) {
        console.error("Error stopping election:", error);
        alert("Failed to stop the election.");
    }
};

// ✅ Get Active Election
window.getActiveElection = async function () {
    const querySnapshot = await getDocs(query(collection(db, "elections"), where("active", "==", true), limit(1)));
    return !querySnapshot.empty ? querySnapshot.docs[0].id : null;
};

// ✅ Get Latest Election ID
window.getLatestElectionID = async function () {
    const electionQuery = query(collection(db, "elections"), where("active", "==", true), limit(1));
    const electionSnapshot = await getDocs(electionQuery);
    return !electionSnapshot.empty ? electionSnapshot.docs[0].id : "UNKNOWN_ELECTION";
};

// ✅ Load Election Dropdown
window.loadElectionDropdown = async function () {
    const electionDropdown = document.getElementById("electionSelect");

    if (!electionDropdown) {
        console.error("Error: 'electionSelect' element not found in the DOM.");
        return;
    }

    try {
        // Fetch elections from Firestore
        const electionsSnapshot = await getDocs(collection(db, "elections"));

        // Clear existing options
        electionDropdown.innerHTML = "";

        // Check if elections exist
        if (electionsSnapshot.empty) {
            electionDropdown.innerHTML = `<option value="">No Elections Found</option>`;
            return;
        }

        // Populate dropdown with elections
        electionsSnapshot.forEach((doc) => {
            const data = doc.data();
            const option = document.createElement("option");
            option.value = doc.id; // Election document ID
            option.textContent = data.electionID; // Display Name
            electionDropdown.appendChild(option);
        });

    } catch (error) {
        console.error("Error loading elections:", error);
        electionDropdown.innerHTML = `<option value="">Error Loading Elections</option>`;
    }
};

// ✅ Update Election ID with Verification
window.updateElectionID = async function () {
    const electionSelect = document.getElementById("electionSelect");

    if (!electionSelect) {
        console.error("Error: 'electionSelect' element not found.");
        return;
    }

    const selectedElectionID = electionSelect.value;

    if (!selectedElectionID) {
        console.warn("No election selected.");
        return;
    }

    console.log(`Attempting to update election ID to: ${selectedElectionID}`);

    try {
        // Store the selected election ID in Firestore
        await setDoc(doc(db, "admin", "currentElection"), { 
            electionID: selectedElectionID,
            lastUpdated: new Date().toISOString()
        });

        // Verify the update
        console.log("Verifying election ID update in Firestore...");
        const verificationDoc = await getDoc(doc(db, "admin", "currentElection"));
        
        if (verificationDoc.exists()) {
            const verifiedData = verificationDoc.data();
            console.log("Verification Results:");
            console.log("Expected Election ID:", selectedElectionID);
            console.log("Stored Election ID:", verifiedData.electionID);
            console.log("Last Updated:", verifiedData.lastUpdated);
            
            if (verifiedData.electionID === selectedElectionID) {
                console.log("✅ Election ID successfully verified in Firebase!");
            } else {
                console.error("❌ Election ID verification failed - data mismatch!");
                alert("Warning: Election ID update showed inconsistent data.");
            }
        } else {
            console.error("❌ Election ID verification failed - document not found!");
            alert("Error: Election ID update could not be verified!");
        }

        // Refresh voting results
        await loadVotingResults();
        
    } catch (error) {
        console.error("Error updating election ID in Firestore:", error);
        alert("Failed to update election ID: " + error.message);
    }
};

// ✅ Ensure Firestore Listens for Election Changes
document.addEventListener("DOMContentLoaded", () => {
    console.log("DOM fully loaded, setting up Firestore listeners.");

    const electionRef = doc(db, "admin", "currentElection");

    // Listen for election changes in Firestore
    onSnapshot(electionRef, (docSnapshot) => {
        if (docSnapshot.exists()) {
            console.log("Election changed, reloading results...");
            loadVotingResults(); // Reload results when election changes
        } else {
            console.warn("No active election found in Firestore.");
        }
    });

    // Load election dropdown and history
    loadElectionDropdown();
    loadElectionHistory();
});

// ✅ Load Data on Startup
setInterval(loadVotingResults, 5000);
loadVotingResults();