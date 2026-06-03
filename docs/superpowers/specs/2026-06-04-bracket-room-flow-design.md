# FIFA WC 2026 App — Bracket Room Flow Design

**Date:** 2026-06-04  
**Status:** Approved  

---

## Overview

A room-based bracket prediction app for FIFA World Cup 2026. Users join a room, independently predict group stage finishing order and knockout round winners, then share and compare completed brackets. A signed export proves when predictions were made.

---

## 1. Room Creation & Joining

**Flow:**
- Host creates a room → receives a 4-letter code (e.g. `WC47`) and a QR code
- Friends join by entering the code or scanning QR
- Host sees a live member list and taps **Start** to lock the room and begin picks
- No joining after Start is tapped

**Key constraints:**
- Each user picks independently — this is a competing predictions model, not a shared bracket
- Server URL is configured in the existing Profile settings screen

---

## 2. Group Stage — Drag to Seed

**What the user does:**  
For each of the 12 groups (A–L), drag teams into their predicted finishing order: 1st, 2nd, 3rd, 4th.

**UI:**
- **12-dot progress strip** at top — green = locked, amber = current group, grey = not started
- **Drag ⠿ handle** on each team row to reorder
- **Pill navigation** at bottom to swipe between groups A–L
- **Friends' avatars** shown below the list indicating which group each member is currently on
- Color coding: 1st/2nd rows green (→ R32), 3rd row amber (→ best-third pool), 4th row grey (eliminated)

**Confirm & Lock:**
- After ordering, user taps **Lock Group**
- Confirmation preview shows: 1st + 2nd advancing to R32, 3rd entering best-third pool, 4th eliminated
- Cannot change after locking
- Once all 12 groups are locked, the R32 bracket is auto-generated

**R32 Auto-generation:**
- Top 2 from each group = 24 guaranteed R32 slots
- Best 8 of 12 third-placers determined by points, then goal difference proxy (FIFA ranking as tiebreaker)
- Bracket matchups assigned using FIFA's Annex C table (495 possible combinations resolved automatically)

---

## 3. Knockout Bracket — March Madness Style

**Rounds:** R32 (32 matches) → R16 (16) → QF (8) → SF (4) → Final (1)

**Picking:**
- Tap a team card to pick the winner of each match
- Next round tab unlocks only after all matches in the current round are picked
- Past rounds are read-only (can view, cannot change)

**Friends' picks:**
- Each match card shows small friend avatars with their pick
- Green avatar = same pick as you, grey = different pick

**Seeding:**
- R32 bracket seeded directly from each user's group stage predictions — each user's bracket is unique to their group picks

---

## 4. Final Page — Completed Bracket Hub

Shown after the Final is picked. Serves as the permanent home for a completed bracket.

**Quick links:**
- **Group Stage** — read-only view of all 12 group predictions
- **Knockout Bracket** — read-only view of full R32→Final tree
- **Room** — list of room members; tap any member to view their bracket side by side with yours

**Export Bracket Photo:**
- Tapping **Export** sends the completed bracket to the server
- Server generates a shareable bracket image
- Image metadata contains a **signed timestamp key** — a server-generated token recording the exact date/time the final pick was locked, preventing backdating of predictions
- Export is available anytime after bracket completion; the timestamp key is set once when the last pick is made

---

## Data Model Notes

- `Room`: id, code, hostId, members[], status (lobby | active | complete)
- `UserBracket`: userId, roomId, groupPredictions{}, knockoutPicks{}, completedAt, signedKey
- `groupPredictions`: `{ [groupLetter]: [teamId, teamId, teamId, teamId] }` — ordered 1st→4th
- `knockoutPicks`: `{ [matchId]: teamId }` — one entry per knockout match
- `signedKey`: server-issued HMAC or JWT stamped at `completedAt`

---

## Out of Scope

- Scoring / points system — not needed; comparison is bracket vs bracket
- Changing picks after locking — no edits once a group or round is confirmed
- Joining a room mid-bracket — room locks when host taps Start
