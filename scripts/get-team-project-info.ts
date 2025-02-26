#!/usr/bin/env node
// @ts-check

import { LinearAuth } from "../src/auth.js";
import { LinearGraphQLClient } from "../src/graphql/client.js";
import { config } from "dotenv";

// Load environment variables
config();

/**
 * Main function
 */
async function main() {
  try {
    const LINEAR_ACCESS_TOKEN = process.env.LINEAR_ACCESS_TOKEN;

    if (!LINEAR_ACCESS_TOKEN) {
      console.error(
        "\nError: LINEAR_ACCESS_TOKEN not found in environment variables",
      );
      console.error(
        "Please set it in your .env file or export it as an environment variable\n",
      );
      process.exit(1);
    }

    // Initialize Linear client
    const auth = new LinearAuth();
    auth.initialize({
      type: "pat",
      accessToken: LINEAR_ACCESS_TOKEN,
    });

    const client = new LinearGraphQLClient(auth.getClient());

    // Display user info
    const userInfo = await client.getCurrentUser();
    console.log("\n=== Linear API Test Tokens ===");
    console.log(
      `Connected as: ${userInfo?.viewer?.name || "Unknown"} (${userInfo?.viewer?.email || "Unknown"})\n`,
    );

    // Get and display all teams
    const teamsResult = await client.getTeams();

    console.log("=== Teams ===");
    if (teamsResult?.teams?.nodes?.length) {
      teamsResult.teams.nodes.forEach((team) => {
        console.log(`[Team] ${team.name}`);
        console.log(`  ID: ${team.id}`);
        console.log(`  Key: ${team.key}`);
        console.log("");
      });
    } else {
      console.log("No teams found");
    }

    // Get and display all projects
    const projectsResult = await client.searchProjects({});

    console.log("=== Projects ===");
    if (projectsResult?.projects?.nodes?.length) {
      projectsResult.projects.nodes.forEach((project) => {
        console.log(`[Project] ${project.name}`);
        console.log(`  ID: ${project.id}`);
        if (project.teams) {
          project.teams.nodes.forEach((team) => {
            console.log(`  Team: ${team.name} (${team.id})`);
          });
        }
        console.log("");
      });
    } else {
      console.log("No projects found");
    }

    console.log("=== Environment Variable Setup ===");
    console.log(
      "To use these values in your integration tests, add them to your .env file:",
    );
    console.log("");
    console.log("LINEAR_ACCESS_TOKEN=your_token_here");
    console.log("TEAMID=selected_team_id_here");
    console.log("PROJECTID=selected_project_id_here");
    console.log("");
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

// Run the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
