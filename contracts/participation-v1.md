# Enerlectra Community Energy Participation Agreement (v1.0)

**Project:** Kabwe Central Solar Cooperative  
**System:** Enerlectra v0.1.0-demo (Kabwe)  

## 1. Purpose

This agreement sets out how contributions to the Kabwe Central Solar Cooperative are recorded and how ownership and distributions are computed by Enerlectra.

Enerlectra does not assign ownership — it computes it.

## 2. Contributions

2.1. Each participant may contribute funds towards the Kabwe Central Solar Cooperative.  
2.2. Each contribution is recorded in the Enerlectra ledger with:
- `clusterId`
- `userId`
- `amountZMW`
- `timestamp`
- a unique `contributionId`

2.3. Contributions are immutable once recorded, except in the case of error correction as described in Section 7.

## 3. Ownership computation

3.1. For a given cluster, Enerlectra computes each participant’s ownership as:

\[
\text{ownershipPct} = \frac{\text{amountZMW}}{\sum \text{amountZMW across all participants}} \times 100
\]

3.2. Ownership percentages for a cluster must sum to approximately 100%, subject to rounding.  
3.3. New contributions update ownership percentages for all participants.

## 4. Outcomes and simulation

4.1. Enerlectra provides a simulation engine which estimates:
- total generation (kWh)
- total consumption (kWh)
- surplus or deficit (kWh)
- a status flag (`healthy`, `stressed`, `offline`)

4.2. Simulations are for planning and explanation only and do **not** create any legal obligation.

## 5. Distribution of surplus or deficit

5.1. When the cooperative declares a surplus or deficit in kWh for a period, Enerlectra computes an allocation for each participant as:

\[
\text{allocatedKwh} = \text{ownershipPct} \times \frac{\text{totalKwh}}{100}
\]

5.2. These allocations may be used as the basis for financial payouts, tariff reductions, or energy credits, as decided by the cooperative.

## 6. Fees

6.1. Enerlectra may charge fees as described in `fees/fees-v1.json` at the time of use.  
6.2. Any change to the fee schedule must be:
- versioned in `fees/fees-v1.json`
- reflected in this agreement
- communicated to participants before taking effect.

## 7. Error correction

7.1. If a contribution is recorded incorrectly, participants may request a correction.  
7.2. Corrections are logged as separate ledger entries; original entries are not deleted.  
7.3. Ownership is recomputed after any correction.

## 8. Data and transparency

8.1. Participants have the right to:
- view their recorded contributions
- view their computed ownership
- view the rules used for simulation and distribution.

8.2. The Kabwe Admin dashboard is a reference implementation of these rights.

---

**Version:** v1.0  
**Effective date:** 2025-12-16  
**System tag:** Enerlectra v0.1.0-demo (Kabwe)
