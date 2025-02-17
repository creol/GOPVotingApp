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

        alert(`New Election Started: ${newElectionID}`);
        loadElectionHistory();
    } catch (error) {
        console.error("Error starting election:", error);
        alert("Failed to start election.");
    }
};

// Add this near the top of your script with other initialization code
let electionListener = null;

// Add this function to set up the election listener
function setupElectionListener() {
    // Remove any existing listener
    if (electionListener) {
        electionListener();
    }

    // Set up new listener for active elections
    const activeElectionQuery = query(collection(db, "elections"), where("active", "==", true));
    electionListener = onSnapshot(activeElectionQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === "added" || change.type === "modified") {
                const electionData = change.doc.data();
                console.log("🔄 Election Update Detected:");
                console.log("Election ID:", electionData.electionID);
                console.log("Active Status:", electionData.active);
                console.log("Round Number:", electionData.round);
                console.log("Start Time:", electionData.startTime);
            }
        });
    });
}

// Modify the startElection function to include real-time verification
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
        
        // Setup listener before creating the election
        setupElectionListener();

        // Store the election
        await setDoc(doc(db, "elections", newElectionID), {
            electionID: newElectionID,
            round: roundNumber,
            active: true,
            startTime: new Date().toISOString()
        });

        console.log("⏳ Waiting for real-time election verification...");

        // The listener will automatically log the verification details

        alert(`New Election Started: ${newElectionID}`);
        loadElectionHistory();
    } catch (error) {
        console.error("Error starting election:", error);
        alert("Failed to start election.");
    }
};

// Add this to your DOMContentLoaded event listener
document.addEventListener("DOMContentLoaded", () => {
    setupElectionListener();
    loadElectionHistory();
    // ... other initialization code ...
});
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
// admin.js - Updated for Election Management System

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, collection, getDocs, doc, writeBatch, updateDoc, query, setDoc, orderBy, limit, where, getDoc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// 🔹 Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyBK3jFdXbfHqV43kn3hzE1TA9-zt3jt180",
    authDomain: "republican-party-voting-system.firebaseapp.com",
    projectId: "republican-party-voting-system",
    storageBucket: "republican-party-voting-system.firebasestorage.app",
    messagingSenderId: "834541676093",
    appId: "1:834541676093:web:bf0eafa5e0f9ba68e0ec54",
    measurementId: "G-THQJN6HYQD"
};

// 🔹 Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth();
const provider = new GoogleAuthProvider();
const storage = getStorage(app);

// ✅ Election Status Icon
window.updateElectionStatus = async function () {
    const electionStatusIcon = document.getElementById("electionStatusIcon");
    const electionNameElem = document.getElementById("electionName");

    try {
        const activeElectionQuery = query(collection(db, "elections"), where("active", "==", true), limit(1));
        const electionSnapshot = await getDocs(activeElectionQuery);

        if (!electionSnapshot.empty) {
            const activeElection = electionSnapshot.docs[0].data();
            electionStatusIcon.src = "/images/go_sign.png"; // Use locally hosted image
            electionStatusIcon.alt = "Active Election";
            electionNameElem.textContent = activeElection.electionID || "Active Election";
        } else {
            electionStatusIcon.src = "/images/stop_sign.png"; // Use locally hosted image
            electionStatusIcon.alt = "No Active Election";
            electionNameElem.textContent = "No Active Election";
        }
    } catch (error) {
        console.error("Error updating election status:", error);
    }
};

// Load election status on page load and refresh every 5 seconds
document.addEventListener("DOMContentLoaded", window.updateElectionStatus);
setInterval(window.updateElectionStatus, 5000);


// ✅ Admin Login
window.adminLogin = async function () {
    try {
        console.log("Admin login function triggered.");
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        if (user) {
            document.getElementById("adminStatus").innerText = `Logged in as: ${user.email}`;
        }
    } catch (error) {
        console.error("Login failed:", error);
        alert("Login failed: " + error.message);
    }
};

// ✅ Admin Logout
window.adminLogout = async function () {
    try {
        await auth.signOut();
        document.getElementById("adminStatus").innerText = "Not Logged In";
        alert("Logged out successfully.");
    } catch (error) {
        console.error("Logout failed:", error);
        alert("Logout failed: " + error.message);
    }
};

// ✅ Load Active Election Name
window.loadActiveElectionName = async function () {
    const electionNameInput = document.getElementById("electionName");

    if (!electionNameInput) {
        console.error("Election Name input field is missing in the HTML.");
        return;
    }

    try {
        const activeElectionQuery = query(collection(db, "elections"), where("active", "==", true), limit(1));
        const electionSnapshot = await getDocs(activeElectionQuery);

        if (!electionSnapshot.empty) {
            const activeElection = electionSnapshot.docs[0].data();
            let electionName = activeElection.electionID || "";

            // Remove the "- Round X" suffix using regex
            electionName = electionName.replace(/ - Round \d+$/, "");

            electionNameInput.value = electionName;
        } else {
            electionNameInput.value = ""; // Clear input if no active election
        }
    } catch (error) {
        console.error("Error loading active election name:", error);
    }
};
// Call the function when the DOM is fully loaded
document.addEventListener("DOMContentLoaded", window.loadActiveElectionName);

// ✅ Candidate Upload
window.uploadCandidates = async function (event) {
    const file = event.target.files[0];
    if (!file) {
        alert("Please select a CSV file.");
        return;
    }

    // 🔹 Check if an election is active before uploading
    const activeElectionQuery = query(collection(db, "elections"), where("active", "==", true), limit(1));
    const electionSnapshot = await getDocs(activeElectionQuery);

    if (!electionSnapshot.empty) {
        alert("Error: Candidates cannot be changed while an election is active.");
        event.target.value = ""; // Reset file input so user must reselect later
        return;
    }

    const reader = new FileReader();
    reader.onload = async function (e) {
        const csvData = e.target.result;
        const lines = csvData.split("\n").map(line => line.trim()).filter(line => line);
        if (lines.length === 0) {
            alert("The CSV file is empty.");
            return;
        }

        try {
            const candidatesCollection = collection(db, "candidates");

            // Step 1: Delete all existing candidates
            const snapshot = await getDocs(candidatesCollection);
            const batchDelete = writeBatch(db);
            snapshot.forEach((doc) => {
                batchDelete.delete(doc.ref);
            });
            await batchDelete.commit();

            // Step 2: Upload new candidates
            const batchUpload = writeBatch(db);
            lines.forEach((line, index) => {
                const [name] = line.split(","); // Assuming candidate name is in the first column
                if (name) {
                    const candidateRef = doc(candidatesCollection);
                    batchUpload.set(candidateRef, {
                        name: name.trim(),
                        votes: 0, // Reset votes to zero
                        order: index + 1 // Assign an order based on upload sequence
                    });
                }
            });

            await batchUpload.commit();
            alert("Candidates uploaded successfully!");
            window.loadVotingResults(); // Refresh table
        } catch (error) {
            console.error("Error uploading candidates:", error);
            alert("An error occurred while uploading candidates.");
        }
    };

    reader.readAsText(file);
};

// Function to check if an election is active and disable/enable upload buttons
window.checkElectionStatus = async function () {
    const uploadCandidatesInput = document.getElementById("uploadCandidates");
    const uploadVoterIdInput = document.getElementById("voterIdUpload");

    if (!uploadCandidatesInput || !uploadVoterIdInput) {
        console.error("Upload Candidates or Voter IDs input field is missing in the HTML.");
        return;
    }

    try {
        const activeElectionQuery = query(collection(db, "elections"), where("active", "==", true), limit(1));
        const electionSnapshot = await getDocs(activeElectionQuery);

        if (!electionSnapshot.empty) {
            // Active election found - Disable both inputs
            uploadCandidatesInput.disabled = true;
            uploadCandidatesInput.title = "Candidates cannot be changed while an election is active.";
            uploadVoterIdInput.disabled = true;
            uploadVoterIdInput.title = "Voter IDs cannot be changed while an election is active.";
        } else {
            // No active election - Enable both inputs
            uploadCandidatesInput.disabled = false;
            uploadCandidatesInput.title = "";
            uploadVoterIdInput.disabled = false;
            uploadVoterIdInput.title = "";
        }
    } catch (error) {
        console.error("Error checking election status:", error);
    }
};
// Run this function when the page loads
document.addEventListener("DOMContentLoaded", window.checkElectionStatus);
// Refresh the buttons every 5 seconds to reflect any election status changes
setInterval(window.checkElectionStatus, 5000);

// ✅ VoterID Upload
window.uploadVoterIDs = async function (event) {
    const file = event.target.files[0];
    if (!file) {
        alert("Please select a CSV file.");
        return;
    }

    // 🔹 Check if an election is active before uploading
    const activeElectionQuery = query(collection(db, "elections"), where("active", "==", true), limit(1));
    const electionSnapshot = await getDocs(activeElectionQuery);

    if (!electionSnapshot.empty) {
        alert("Error: Voter IDs cannot be changed while an election is active.");
        event.target.value = ""; // Reset file input so user must reselect later
        return;
    }

    const reader = new FileReader();
    reader.onload = async function (e) {
        const csvData = e.target.result;
        const lines = csvData.split("\n").map(line => line.trim()).filter(line => line);
        if (lines.length === 0) {
            alert("The CSV file is empty.");
            return;
        }

        try {
            const votersCollection = collection(db, "voters");

            // Step 1: Delete all existing voters
            const snapshot = await getDocs(votersCollection);
            const batchDelete = writeBatch(db);
            snapshot.forEach((doc) => {
                batchDelete.delete(doc.ref);
            });
            await batchDelete.commit();

            // Step 2: Upload new Voter IDs
            const batchUpload = writeBatch(db);
            lines.forEach((line) => {
                const [voterID] = line.split(","); // Assuming Voter ID is in the first column
                if (voterID) {
                    const voterRef = doc(votersCollection);
                    batchUpload.set(voterRef, {
                        voterID: voterID.trim(),
                        used: false // Reset 'used' status for new voters
                    });
                }
            });

            await batchUpload.commit();
            alert("Voter IDs uploaded successfully! Old voter list replaced.");
        } catch (error) {
            console.error("Error uploading voter IDs:", error);
            alert("An error occurred while uploading voter IDs.");
        }
    };

    reader.readAsText(file);
};

// ✅ Load Voting Results
let sortByVotes = false; // Default to Official Order
window.loadVotingResults = async function () {
    const resultsTable = document.getElementById("resultsTable");
    const totalVotersElem = document.getElementById("totalVoters");
    const votesCastElem = document.getElementById("votesCast");
    const remainingVotesElem = document.getElementById("remainingVotes");

    try {
        const candidateSnapshot = await getDocs(collection(db, "candidates"));
        let totalVotes = 0;
        let candidateResults = [];

        // Fetch all candidates and compute total votes
        candidateSnapshot.forEach((doc) => {
            const data = doc.data();
            totalVotes += data.votes || 0;
            candidateResults.push({ 
                id: doc.id, 
                name: data.name, 
                votes: data.votes || 0, 
                order: data.order || 0 // Order from DB
            });
        });

        // Fetch total voter count
        const voterSnapshot = await getDocs(collection(db, "voters"));
        const totalVoters = voterSnapshot.size;
        const remainingVotes = totalVoters - totalVotes;
        const remainingPercentage = totalVoters > 0 ? ((remainingVotes / totalVoters) * 100).toFixed(2) : "0.00";

        // Update Vote Stats table
        totalVotersElem.textContent = totalVoters;
        votesCastElem.textContent = totalVotes;
        remainingVotesElem.textContent = `${remainingVotes} (${remainingPercentage}%)`;

        // Sort candidates based on toggle state
        if (sortByVotes) {
            candidateResults.sort((a, b) => b.votes - a.votes); // Sort by most votes
        } else {
            candidateResults.sort((a, b) => a.order - b.order); // Sort by database order
        }

        // Populate table
        resultsTable.innerHTML = "";
        candidateResults.forEach(({ id, name, votes }) => {
            const percentage = totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(2) : "0.00";
            const row = document.createElement("tr");
            row.setAttribute("data-candidate-id", id);

            row.innerHTML = `
                <td>${name}</td>
                <td class="votes">${votes}</td>
                <td class="percentage">${percentage}%</td>
            `;
            resultsTable.appendChild(row);
        });

    } catch (error) {
        console.error("Error loading voting results:", error);
    }
};

// Toggle sorting mode and refresh table
window.toggleSortOrder = function () {
    sortByVotes = !sortByVotes;
    document.getElementById("toggleSort").textContent = sortByVotes ? "Sort: Most Votes" : "Sort: Official Order";
    window.loadVotingResults();
};

// Load results immediately and refresh every 5 seconds
document.addEventListener("DOMContentLoaded", window.loadVotingResults);
setInterval(window.loadVotingResults, 5000);

// Load results immediately and refresh every 5 seconds
document.addEventListener("DOMContentLoaded", window.loadVotingResults);
setInterval(window.loadVotingResults, 5000);

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
document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("electionSelect")) {
        window.loadElectionDropdown();
    }
});

// ✅ Update Election ID with Verification
window.updateElectionID = async function (selectedElectionID) {
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

// Add this to your DOMContentLoaded event listener
document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("electionSelect")) {
        window.loadElectionDropdown();
    }
});

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

// ✅ Start a New Election
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
        await setDoc(doc(db, "elections", newElectionID), {
            electionID: newElectionID,
            round: roundNumber,
            active: true,
            startTime: new Date().toISOString()
        });

        alert(`New Election Started: ${newElectionID}`);
        loadElectionHistory();
    } catch (error) {
        console.error("Error starting election:", error);
        alert("Failed to start election.");
    }
};

// ✅ Load Election History
window.loadElectionHistory = async function () {
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
};

// ✅ Fix Undefined Function Load Issue
window.loadLatestElection = async function () {
    const electionQuery = query(collection(db, "elections"), orderBy("createdAt", "desc"), limit(1));
    const snapshot = await getDocs(electionQuery)
    console.log("loadLatestElection -> snapshot", snapshot);

    if (!snapshot.empty) {
        const latestElection = snapshot.docs[0].data();
        document.getElementById("electionName").value = latestElection.electionID.split(" - Round ")[0];
        document.getElementById("roundNumber").value = latestElection.round;
    }
};

// Function to toggle results visibility
window.toggleResultsVisibility = async function () {
    const resultsVisibilityElement = document.getElementById("resultsVisibility");

    if (!resultsVisibilityElement) {
        console.error("Error: 'resultsVisibility' select element not found.");
        return;
    }

    const visibility = resultsVisibilityElement.value === "show";

    try {
        await setDoc(doc(db, "admin", "resultsVisibility"), { visible: visibility });

        alert(`Results visibility set to: ${visibility ? "Show" : "Hide"}`);

        // Update UI after change
        updateToggleButton(!visibility);
    } catch (error) {
        console.error("Error updating results visibility:", error);
    }
};


// Function to load results visibility setting on page load
window.loadResultsVisibility = async function () {
    const docSnap = await getDoc(doc(db, "admin", "resultsVisibility"));
    if (docSnap.exists()) {
        const isVisible = docSnap.data().visible;
        document.getElementById("resultsVisibility").value = isVisible ? "show" : "hide";
    }
};
// Load visibility setting on page load
document.addEventListener("DOMContentLoaded", window.loadResultsVisibility);

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
});

// ✅ Load Data on Startup
setInterval(loadVotingResults, 5000);
//loadResults();
loadLatestElection();
loadElectionHistory();

// ✅ Load Election History with Radio Buttons and Sorting
window.loadElectionHistory = async function () {
    const electionTable = document.getElementById("electionHistory");
    electionTable.innerHTML = "";

    try {
        const electionsSnapshot = await getDocs(query(collection(db, "elections"), orderBy("startTime", "desc")));
        electionsSnapshot.forEach((doc) => {
            const data = doc.data();
            const row = document.createElement("tr");

            const selectCell = document.createElement("td");
            const formCheck = document.createElement("div");
            formCheck.classList.add("form-check");
            const radioButton = document.createElement("input");
            radioButton.type = "radio";
            radioButton.name = "electionSelect";
            radioButton.value = doc.id;
            radioButton.classList.add("form-check-input");
            radioButton.onclick = () => updateElectionID(doc.id);
            formCheck.appendChild(radioButton);
            selectCell.appendChild(formCheck);

            const nameCell = document.createElement("td");
            nameCell.textContent = data.electionID;

            const startTimeCell = document.createElement("td");
            startTimeCell.textContent = new Date(data.startTime).toLocaleString();

            const endTimeCell = document.createElement("td");
            endTimeCell.textContent = data.endTime ? new Date(data.endTime).toLocaleString() : "Ongoing";

            row.appendChild(selectCell);
            row.appendChild(nameCell);
            row.appendChild(startTimeCell);
            row.appendChild(endTimeCell);

            electionTable.appendChild(row);

            // Set the default selected election to the ongoing one
            if (!data.endTime) {
                radioButton.checked = true;
                updateElectionID(doc.id);
            }
        });
    } catch (error) {
        console.error("Error loading election history:", error);
    }
};

// ✅ Update Results Page Based on Selected Election ID
window.updateResultsPage = function (selectedElectionID) {
    const electionIDSelect = document.getElementById("electionIDSelect");
    if (selectedElectionID) {
        electionIDSelect.value = selectedElectionID;
    } else {
        selectedElectionID = electionIDSelect.value;
    }
    // Logic to update the results page based on selectedElectionID
    console.log(`Selected Election ID: ${selectedElectionID}`);
};

// Add this to your DOMContentLoaded event listener
document.addEventListener("DOMContentLoaded", () => {
    setupElectionListener();
    loadElectionHistory();
    // ... other initialization code ...
});
