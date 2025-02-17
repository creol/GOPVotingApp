import { getFirestore, collection, getDocs, query, where, limit, setDoc, doc, onSnapshot } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const db = getFirestore();

// Function to load voting results
export let sortByVotes = false; // Default to Official Order

export async function loadVotingResults() {
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
}

// Function to toggle sorting mode and refresh table
export function toggleSortOrder() {
    sortByVotes = !sortByVotes;
    document.getElementById("toggleSort").textContent = sortByVotes ? "Sort: Most Votes" : "Sort: Official Order";
    loadVotingResults();
}

// Function to toggle results visibility
export async function toggleResultsVisibility() {
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
}

// Function to load results visibility setting on page load
export async function loadResultsVisibility() {
    const docSnap = await getDoc(doc(db, "admin", "resultsVisibility"));
    if (docSnap.exists()) {
        const isVisible = docSnap.data().visible;
        document.getElementById("resultsVisibility").value = isVisible ? "show" : "hide";
    }
}