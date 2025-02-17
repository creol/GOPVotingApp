// filepath: /admin-project/admin-project/public/js/admin.js
document.addEventListener("DOMContentLoaded", () => {
    loadElectionDropdown();
    loadActiveElectionName();
    checkElectionStatus();
    loadVotingResults();
    loadResultsVisibility();
});

// Firebase Config
const firebaseConfig = {
    apiKey: "AIzaSyBK3jFdXbfHqV43kn3hzE1TA9-zt3jt180",
    authDomain: "republican-party-voting-system.firebaseapp.com",
    projectId: "republican-party-voting-system",
    storageBucket: "republican-party-voting-system.firebasestorage.app",
    messagingSenderId: "834541676093",
    appId: "1:834541676093:web:bf0eafa5e0f9ba68e0ec54",
    measurementId: "G-THQJN6HYQD"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth();
const provider = new GoogleAuthProvider();

// Navigation Menu Functionality
function toggleMenu() {
    const menu = document.getElementById("navMenu");
    menu.classList.toggle("active");
}

// Election Management Functions
async function startElection() {
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
}

async function stopActiveElection() {
    const electionID = await getLatestElectionID();
    if (electionID === "UNKNOWN_ELECTION") {
        alert("No active election found.");
        return;
    }

    // Logic to stop the election and save results
}

// Candidate Upload Functions
async function uploadCandidates(event) {
    const file = event.target.files[0];
    if (!file) {
        alert("Please select a CSV file.");
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
            const batchDelete = writeBatch(db);
            const snapshot = await getDocs(candidatesCollection);
            snapshot.forEach((doc) => {
                batchDelete.delete(doc.ref);
            });
            await batchDelete.commit();

            const batchUpload = writeBatch(db);
            lines.forEach((line) => {
                const [name] = line.split(","); // Assuming name is in the first column
                if (name) {
                    batchUpload.set(doc(candidatesCollection), { name, votes: 0 });
                }
            });

            await batchUpload.commit();
            alert("Candidates uploaded successfully!");
            loadVotingResults();
        } catch (error) {
            console.error("Error uploading candidates:", error);
            alert("An error occurred while uploading candidates.");
        }
    };

    reader.readAsText(file);
}

// Voting Results Functions
async function loadVotingResults() {
    const resultsTable = document.getElementById("resultsTable");
    try {
        const candidateSnapshot = await getDocs(collection(db, "candidates"));
        let totalVotes = 0;
        let candidateResults = [];

        candidateSnapshot.forEach((doc) => {
            const data = doc.data();
            totalVotes += data.votes || 0;
            candidateResults.push({ id: doc.id, name: data.name, votes: data.votes || 0 });
        });

        resultsTable.innerHTML = "";
        candidateResults.forEach(({ id, name, votes }) => {
            const row = document.createElement("tr");
            row.innerHTML = `<td>${name}</td><td>${votes}</td>`;
            resultsTable.appendChild(row);
        });
    } catch (error) {
        console.error("Error loading voting results:", error);
    }
}

// Authentication Functions
async function adminLogin() {
    try {
        const result = await signInWithPopup(auth, provider);
        alert("Login successful!");
    } catch (error) {
        console.error("Login failed:", error);
        alert("Login failed: " + error.message);
    }
}

async function adminLogout() {
    try {
        await auth.signOut();
        alert("Logged out successfully.");
    } catch (error) {
        console.error("Logout failed:", error);
        alert("Logout failed: " + error.message);
    }
}

// Load Dropdown and Active Election Name
async function loadElectionDropdown() {
    const electionDropdown = document.getElementById("electionSelect");
    try {
        const electionsSnapshot = await getDocs(collection(db, "elections"));
        electionDropdown.innerHTML = "";
        electionsSnapshot.forEach((doc) => {
            const option = document.createElement("option");
            option.value = doc.id;
            option.textContent = doc.data().electionID;
            electionDropdown.appendChild(option);
        });
    } catch (error) {
        console.error("Error loading elections:", error);
    }
}

async function loadActiveElectionName() {
    const electionNameInput = document.getElementById("electionName");
    try {
        const activeElectionQuery = query(collection(db, "elections"), where("active", "==", true), limit(1));
        const electionSnapshot = await getDocs(activeElectionQuery);
        if (!electionSnapshot.empty) {
            electionNameInput.value = electionSnapshot.docs[0].data().electionID;
        }
    } catch (error) {
        console.error("Error loading active election name:", error);
    }
}

// Check Election Status
async function checkElectionStatus() {
    const uploadCandidatesInput = document.getElementById("uploadCandidates");
    try {
        const activeElectionQuery = query(collection(db, "elections"), where("active", "==", true), limit(1));
        const electionSnapshot = await getDocs(activeElectionQuery);
        uploadCandidatesInput.disabled = !electionSnapshot.empty;
    } catch (error) {
        console.error("Error checking election status:", error);
    }
}

// Results Visibility
async function loadResultsVisibility() {
    const resultsVisibilityElement = document.getElementById("resultsVisibility");
    resultsVisibilityElement.value = "show"; // Default visibility
}

// Event Listeners
document.getElementById("uploadCandidates").addEventListener("change", uploadCandidates);
document.getElementById("startElectionButton").addEventListener("click", startElection);
document.getElementById("stopElectionButton").addEventListener("click", stopActiveElection);
document.getElementById("adminLoginButton").addEventListener("click", adminLogin);
document.getElementById("adminLogoutButton").addEventListener("click", adminLogout);