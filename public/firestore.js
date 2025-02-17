import { getFirestore, collection, getDocs, doc, writeBatch, updateDoc, query, setDoc, orderBy, limit, where, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const db = getFirestore();

// Firestore functions

export async function getActiveElection() {
    const querySnapshot = await getDocs(query(collection(db, "elections"), where("active", "==", true), limit(1)));
    return !querySnapshot.empty ? querySnapshot.docs[0].id : null;
}

export async function getLatestElectionID() {
    const electionQuery = query(collection(db, "elections"), where("active", "==", true), limit(1));
    const electionSnapshot = await getDocs(electionQuery);
    return !electionSnapshot.empty ? electionSnapshot.docs[0].id : "UNKNOWN_ELECTION";
}

export async function stopActiveElection() {
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
}

export async function startElection(electionName, roundNumber) {
    const existingElection = await getActiveElection();
    if (existingElection) {
        await stopActiveElection();
    }

    const newElectionID = `${electionName} - Round ${roundNumber}`;
    await setDoc(doc(db, "elections", newElectionID), {
        electionID: newElectionID,
        round: roundNumber,
        active: true,
        startTime: new Date().toISOString()
    });

    alert(`New Election Started: ${newElectionID}`);
    loadElectionHistory();
}

export async function loadElectionHistory() {
    const electionTable = document.getElementById("electionHistory");
    electionTable.innerHTML = "";

    try {
        const electionsSnapshot = await getDocs(collection(db, "elections"));
        electionsSnapshot.forEach((doc) => {
            const data = doc.data();
            electionTable.innerHTML += `<tr>
                <td>${data.electionID}</td>
                <td>${data.startTime || "-"}</td>
                <td>${data.endTime || "Ongoing"}</td>
            </tr>`;
        });
    } catch (error) {
        console.error("Error loading election history:", error);
    }
}