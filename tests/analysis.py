from dotenv import load_dotenv
import requests
import os
import numpy as np
from scipy.linalg import lstsq
import matplotlib.pyplot as plt

def calculate_opr(matches_dict):
    """
    Calculate OPR for teams given a dictionary of matches.
    
    Args:
        matches_dict: Dict of {match_num: {Red1: team_id, Red2: team_id, Blue1: team_id, Blue2: team_id, Red: score, Blue: score}}
    
    Returns:
        Dict of {team_id: opr_value}
    """
    # Collect all unique teams
    all_teams = set()
    for match_data in matches_dict.values():
        if "Red1" in match_data:
            all_teams.add(match_data["Red1"])
        if "Red2" in match_data:
            all_teams.add(match_data["Red2"])
        if "Blue1" in match_data:
            all_teams.add(match_data["Blue1"])
        if "Blue2" in match_data:
            all_teams.add(match_data["Blue2"])
    
    if not all_teams:
        return {}
    
    teams_list = sorted(list(all_teams))
    team_to_index = {team: idx for idx, team in enumerate(teams_list)}
    
    num_teams = len(teams_list)
    
    A = []
    b = []
    
    for match_num in sorted(matches_dict.keys(), key=int):
        match_data = matches_dict[match_num]
        
        # Red alliance equation
        if "Red" in match_data and "Red1" in match_data and "Red2" in match_data:
            row = [0] * num_teams
            row[team_to_index[match_data["Red1"]]] = 1
            row[team_to_index[match_data["Red2"]]] = 1
            A.append(row)
            b.append(match_data["Red"])
        
        # Blue alliance equation
        if "Blue" in match_data and "Blue1" in match_data and "Blue2" in match_data:
            row = [0] * num_teams
            row[team_to_index[match_data["Blue1"]]] = 1
            row[team_to_index[match_data["Blue2"]]] = 1
            A.append(row)
            b.append(match_data["Blue"])
    
    if not A:
        return {}
    
    # Solve the least squares problem
    A_matrix = np.array(A)
    b_vector = np.array(b)
    
    opr_values, residuals, rank, s = lstsq(A_matrix, b_vector)
    
    return {teams_list[i]: round(opr_values[i], 2) for i in range(num_teams)}

load_dotenv()
FTC_API_USERNAME = os.getenv("FTC_API_USERNAME")
FTC_API_TOKEN = os.getenv("FTC_API_TOKEN")
MEETS = ["USMOKSKCWM1", "USMOKSKCWM2", "USMOKSKCWM3", "USMOKSKCWM4", "USMOKSKCWM5"]

s = requests.Session()

s.auth = (FTC_API_USERNAME, FTC_API_TOKEN)

print("Fetching data...")

schedules = {}
for j in MEETS:
    r = s.get(f"https://ftc-api.firstinspires.org/v2.0/2025/schedule/{j}?tournamentLevel=qual")
    data = r.json()
    if len(data["schedule"]) == 0: continue
    schedules[j] = data["schedule"]

scoring_data = {}
detailed_scoring_data = {}
for j in schedules.keys():
    r = s.get(f"https://ftc-api.firstinspires.org/v2.0/2025/scores/{j}/qual")
    data = r.json()
    if len(data["matchScores"]) == 0: continue
    scoring_data[j] = data["matchScores"]
    detailed_scoring_data[j] = data["matchScores"]

data = {}
auto_artifacts_data = {}
teleop_artifacts_data = {}

for event_code in scoring_data.keys():
    data[event_code] = {}
    auto_artifacts_data[event_code] = {}
    teleop_artifacts_data[event_code] = {}
    
    for schedule_match in schedules[event_code]:
        match_number = str(schedule_match["matchNumber"])
        
        # Find corresponding scoring data
        for score_match in detailed_scoring_data[event_code]:
            if schedule_match["matchNumber"] == score_match["matchNumber"]:
                # Initialize match data
                match_data = {}
                auto_match_data = {}
                teleop_match_data = {}
                
                # Extract team assignments from schedule
                for team in schedule_match["teams"]:
                    station = team["station"]
                    team_number = team["teamNumber"]
                    match_data[station] = team_number
                    auto_match_data[station] = team_number
                    teleop_match_data[station] = team_number
                
                # Extract scores from scoring data
                for alliance in score_match["alliances"]:
                    alliance_name = alliance["alliance"]
                    total_points = alliance["totalPoints"]
                    match_data[alliance_name] = total_points
                    
                    # Extract auto artifacts
                    auto_artifacts = alliance.get("autoClassifiedArtifacts", 0) + alliance.get("autoOverflowArtifacts", 0)
                    if alliance_name == "Red":
                        auto_match_data["Red"] = auto_artifacts
                    else:
                        auto_match_data["Blue"] = auto_artifacts
                    
                    # Extract teleop artifacts
                    teleop_artifacts = alliance.get("teleopClassifiedArtifacts", 0) + alliance.get("teleopOverflowArtifacts", 0)
                    if alliance_name == "Red":
                        teleop_match_data["Red"] = teleop_artifacts
                    else:
                        teleop_match_data["Blue"] = teleop_artifacts
                
                data[event_code][match_number] = match_data
                auto_artifacts_data[event_code][match_number] = auto_match_data
                teleop_artifacts_data[event_code][match_number] = teleop_match_data
                break

print("Calculating OPR metrics...")

# 1. Calculate OPR per event (meet)
opr_per_event = {}
for event_code in data.keys():
    opr_per_event[event_code] = calculate_opr(data[event_code])

# 2. Calculate OPR for whole season (all meets combined)
all_matches = {}
match_counter = 1
for event_code in data.keys():
    for match_num, match_data in data[event_code].items():
        all_matches[str(match_counter)] = match_data.copy()
        match_counter += 1

opr_season = calculate_opr(all_matches)

# 3. Calculate Auto Artifacts OPR per event
auto_artifacts_opr_per_event = {}
for event_code in auto_artifacts_data.keys():
    auto_artifacts_opr_per_event[event_code] = calculate_opr(auto_artifacts_data[event_code])

# 4. Calculate Teleop Artifacts OPR per event
teleop_artifacts_opr_per_event = {}
for event_code in teleop_artifacts_data.keys():
    teleop_artifacts_opr_per_event[event_code] = calculate_opr(teleop_artifacts_data[event_code])

# Add all OPR metrics to each match
for event_code in data.keys():
    for match_num in data[event_code].keys():
        match_data = data[event_code][match_num]
        
        for station in ["Red1", "Red2", "Blue1", "Blue2"]:
            if station in match_data:
                team_id = match_data[station]
                match_data[f"{station}_OPR_Event"] = opr_per_event[event_code].get(team_id, 0)
                match_data[f"{station}_OPR_Season"] = opr_season.get(team_id, 0)
                match_data[f"{station}_Auto_Artifacts_OPR"] = auto_artifacts_opr_per_event[event_code].get(team_id, 0)
                match_data[f"{station}_Teleop_Artifacts_OPR"] = teleop_artifacts_opr_per_event[event_code].get(team_id, 0)

# print(data)

for k, v in data.items():
    print(f"Event: {k}")
    for match_num, match_data in v.items():
        if 26855 in match_data.values():
            print(f"  Match {match_num}: {match_data}")

# # Visualization
# print("\nGenerating visualizations...")

# # Create figure with subplots
# fig, axes = plt.subplots(2, 2, figsize=(16, 12))
# fig.suptitle("FTC Robotics OPR Analysis", fontsize=16, fontweight="bold")

# # 1. OPR per Event
# ax1 = axes[0, 0]
# for event_code in opr_per_event.keys():
#     teams = list(opr_per_event[event_code].keys())
#     oprs = list(opr_per_event[event_code].values())
#     ax1.scatter([event_code] * len(teams), oprs, alpha=0.6, s=100)

# ax1.set_xlabel("Event Code", fontweight="bold")
# ax1.set_ylabel("OPR", fontweight="bold")
# ax1.set_title("OPR per Event", fontweight="bold")
# ax1.grid(True, alpha=0.3)
# ax1.tick_params(axis="x", rotation=45)

# # 2. OPR Season (Top 20 teams)
# ax2 = axes[0, 1]
# sorted_season_opr = sorted(opr_season.items(), key=lambda x: x[1], reverse=True)[:20]
# teams_season = [str(t[0]) for t in sorted_season_opr]
# oprs_season = [t[1] for t in sorted_season_opr]

# bars = ax2.barh(teams_season, oprs_season, color="steelblue")
# ax2.set_xlabel("Season OPR", fontweight="bold")
# ax2.set_ylabel("Team Number", fontweight="bold")
# ax2.set_title("Top 20 Teams - Season OPR", fontweight="bold")
# ax2.invert_yaxis()
# ax2.grid(True, alpha=0.3, axis="x")

# # Add value labels on bars
# for i, (bar, value) in enumerate(zip(bars, oprs_season)):
#     ax2.text(value, i, f" {value:.1f}", va="center", fontsize=9)

# # 3. Auto Artifacts OPR (Average per event, top 15 teams)
# ax3 = axes[1, 0]
# all_auto_oprs = {}
# for event_code in auto_artifacts_opr_per_event.keys():
#     for team, opr in auto_artifacts_opr_per_event[event_code].items():
#         if team not in all_auto_oprs:
#             all_auto_oprs[team] = []
#         all_auto_oprs[team].append(opr)

# avg_auto_oprs = {team: np.mean(oprs) for team, oprs in all_auto_oprs.items()}
# sorted_auto_opr = sorted(avg_auto_oprs.items(), key=lambda x: x[1], reverse=True)[:15]
# teams_auto = [str(t[0]) for t in sorted_auto_opr]
# oprs_auto = [t[1] for t in sorted_auto_opr]

# bars = ax3.barh(teams_auto, oprs_auto, color="green", alpha=0.7)
# ax3.set_xlabel("Average Auto Artifacts OPR", fontweight="bold")
# ax3.set_ylabel("Team Number", fontweight="bold")
# ax3.set_title("Top 15 Teams - Auto Artifacts Contribution", fontweight="bold")
# ax3.invert_yaxis()
# ax3.grid(True, alpha=0.3, axis="x")

# for i, (bar, value) in enumerate(zip(bars, oprs_auto)):
#     ax3.text(value, i, f" {value:.1f}", va="center", fontsize=9)

# # 4. Teleop Artifacts OPR (Average per event, top 15 teams)
# ax4 = axes[1, 1]
# all_teleop_oprs = {}
# for event_code in teleop_artifacts_opr_per_event.keys():
#     for team, opr in teleop_artifacts_opr_per_event[event_code].items():
#         if team not in all_teleop_oprs:
#             all_teleop_oprs[team] = []
#         all_teleop_oprs[team].append(opr)

# avg_teleop_oprs = {team: np.mean(oprs) for team, oprs in all_teleop_oprs.items()}
# sorted_teleop_opr = sorted(avg_teleop_oprs.items(), key=lambda x: x[1], reverse=True)[:15]
# teams_teleop = [str(t[0]) for t in sorted_teleop_opr]
# oprs_teleop = [t[1] for t in sorted_teleop_opr]

# bars = ax4.barh(teams_teleop, oprs_teleop, color="purple", alpha=0.7)
# ax4.set_xlabel("Average Teleop Artifacts OPR", fontweight="bold")
# ax4.set_ylabel("Team Number", fontweight="bold")
# ax4.set_title("Top 15 Teams - Teleop Artifacts Contribution", fontweight="bold")
# ax4.invert_yaxis()
# ax4.grid(True, alpha=0.3, axis="x")

# for i, (bar, value) in enumerate(zip(bars, oprs_teleop)):
#     ax4.text(value, i, f" {value:.1f}", va="center", fontsize=9)

# plt.tight_layout()
# plt.savefig("opr_analysis.png", dpi=300, bbox_inches="tight")
# print("Visualization saved as 'opr_analysis.png'")
# plt.show()