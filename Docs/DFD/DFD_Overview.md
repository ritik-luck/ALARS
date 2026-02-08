

# DFD Overview — ALARS (Automated Log Analysis & Incident Response System)

This document provides a brief overview of the Data Flow Diagrams (DFDs) for the **ALARS (Automated Log Analysis & Incident Response System)**. It summarizes the purpose and scope of the Level 0 and Level 1 DFDs and how they represent the flow of data in the system.

---

## 1. Purpose of DFDs in ALARS

Data Flow Diagrams help visualize:

- How data moves through the ALARS system  
- The main processes that transform data  
- External entities interacting with the system  
- Data stores where information is kept  

They provide a clear, technology‑independent view of system functionality, useful for design, discussion, and documentation.

---

## 2. Level 0 DFD (Context Diagram)

The **Level 0 DFD** presents ALARS as a single high‑level process and shows its interaction with external entities.

### Key Characteristics

- Represents ALARS as one main process  
- Shows major external entities (e.g., Admin, Log Sources/Agents, Notification Services)  
- Highlights primary data flows such as:
  - Log data coming into the system  
  - Alerts and reports going out  
  - Configuration or rule inputs from admins  

### Goal

To give a quick understanding of:
- What the system does  
- Who interacts with it  
- The main inputs and outputs  

### Level 0 Diagram

![Level 0 DFD](level0.pdf)

---

## 3. Level 1 DFD

The **Level 1 DFD** decomposes the main ALARS process into sub‑processes and introduces internal data stores.

### Typical Sub‑Processes

Examples of processes represented:

1. **Log Collection & Ingestion**  
   - Receives logs from agents/sources  
   - Validates and forwards logs for analysis  

2. **Log Analysis & Correlation**  
   - Applies rules and detection logic  
   - Identifies anomalies or incidents  

3. **Incident Management**  
   - Creates and updates incidents  
   - Tracks status and severity  

4. **Alert & Notification Handling**  
   - Sends alerts to admins or systems  
   - Integrates with notification services  

5. **Reporting & Audit**  
   - Generates reports  
   - Maintains audit trails  

### Data Stores

Common data stores include:

- Log Database  
- Incident Database  
- Rules/Configuration Database  
- Audit Logs  
- Reports Database  

### Goal

To show:
- Internal workflow of ALARS  
- How data is processed step‑by‑step  
- Where data is stored and retrieved  

### Level 1 Diagram

![Level 1 DFD](level1.pdf)

---

## 4. How Level 0 and Level 1 Connect

- Level 0 gives the **big picture**  
- Level 1 gives the **detailed internal view**  
- All inputs/outputs in Level 1 must be consistent with Level 0  
- Level 1 processes collectively realize the single Level 0 process  

---

## 5. Summary

Together, the Level 0 and Level 1 DFDs:

- Clarify system boundaries  
- Explain internal processing  
- Support system design and reviews  
- Help stakeholders understand ALARS without code‑level detail  

They form a foundation for deeper design (Level 2+ DFDs, architecture diagrams, and implementation).

---