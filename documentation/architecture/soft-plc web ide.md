# Soft-PLC Web IDE for ESP32

Based on the `plc_system_design.md` from the ESP-Flow conversation, we are building a full-stack web application to generate PLC-style C++ firmware for ESP32 microcontrollers. 

## Open Questions

> [!IMPORTANT]
> **Project Scope & Initialization**
> 1. Which component would you like to start building first?
>    - **A:** The Django backend (API, Database models, and Code Generator engine)
>    - **B:** The React frontend (Hardware Configurator and React Flow Canvas)
>    - **C:** The C++ firmware templates (Memory map and Scan Cycle for ESP32)
> 2. For local backend development, should we start with SQLite (Django's default) to get things running quickly, or set up MySQL immediately as specified in the design?
> 3. I plan to initialize this project in a new workspace at `C:\Users\VRDDHI\.gemini\antigravity\scratch\esp32-soft-plc`. Let me know if you prefer a different location.

## Proposed Architecture & Roadmap

We will divide the project into three main components:

### 1. Django Backend (`/backend`)
*   Initialize Django with Django REST Framework (DRF).
*   Create models for Users, Projects, Hardware Configurations, and Logic Canvas representations.
*   Implement the C++ Generator using Django Templates to parse the JSON IR and output the `loop()` scan cycle.
*   Setup a background task (e.g., Celery or background threads) to package the generated `.cpp` files with PlatformIO.

### 2. React Frontend (`/frontend`)
*   Initialize a React project using Vite.
*   Install `reactflow` for the visual node editor, `zustand` for state management, and `tailwindcss` for styling.
*   Build the **Hardware Configurator** UI (GPIO mapping).
*   Build the **Logic Canvas** (Nodes for Contacts, Coils, Function Blocks).

### 3. Firmware Template (`/firmware_template`)
*   Setup a standard PlatformIO project for ESP32.
*   Create the base `main.cpp` demonstrating the 4-phase Scan Cycle (Read, Logic, Write, Housekeeping) and the Global Memory Map (`X`, `Y`, `M`, `T`, `C`, `D`).

## Verification Plan

### Automated & Manual Verification
- **Backend:** Write Django unit tests for the JSON parsing and C++ code generation logic.
- **Frontend:** Validate the React Flow node connections and JSON serialization.
- **Firmware:** Manually compile the generated C++ code using PlatformIO to ensure syntax correctness for the ESP32 architecture.
