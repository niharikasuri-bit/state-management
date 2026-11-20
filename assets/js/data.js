/**
 * Mock schema for the SMC - Registration & Delivery configurator.
 * This stands in for a real backend/appconfig response. Shape:
 *
 * MODULE = { name, version, categories: [ { key, label, screens: [ SCREEN ] } ] }
 * SCREEN = {
 *   id, name, badge: 'Locked' | 'Partially Configurable' | 'Fully Configurable',
 *   pageHeading, pageDescription,
 *   elements: [ { id, label, type, configurable, visible, ...typeProps } ]
 * }
 *
 * Element types rendered by app.js: 'searchbar', 'filter', 'emptyState',
 * 'button', 'list', 'field', 'success', 'card'
 */

// A starter example so a state's Logic tab isn't empty by default — each
// call returns a fresh object so editing one state's logic never leaks into
// another's (they'd otherwise share the same object reference).
// thenShow defaults to the state's own name — this logic answers "based on
// what the person filled in, when does THIS status tag appear?", so the
// outcome should be the tag itself, not an unrelated field.
function dummyLogic(thenShow) {
  return {
    conditions: [
      { field: "Gender", page: "Individual details", operator: "equals", value: "Yes" },
      { field: "Age", page: "Individual details", operator: "is more than", value: "18" },
      { field: "Is Pregnant", page: "Individual details", operator: "equals", value: "No" },
    ],
    connector: "And",
    thenShow: thenShow,
  };
}

window.DIGIT_MODULE = {
  name: "Registration & Delivery",
  version: 1,
  categories: [
    {
      key: "registration",
      label: "Registration",
      screens: [
        {
          id: "search-beneficiary",
          name: "Search Beneficiary",
          badge: "Partially Configurable",
          pageHeading: "Search Beneficiary",
          pageDescription: "",
          pageHelp: true,
          elements: [
            { id: "searchbar", label: "Search", type: "searchbar", configurable: true, visible: true, placeholder: "Search", elementType: "Search Bar" },
            { id: "filter", label: "Filter", type: "button", configurable: true, visible: true, text: "Filter", style: "outline", icon: "filter", inlineWithSearch: true, triggersPopup: "popup-filter", ctaGroup: "General actions", elementType: "Action popup" },
            // A dynamic value with multiple STATES, same pattern as Delivery
            // Status: exactly one applies per search at runtime, so the
            // canvas shows none of them by default (activeStateId: null) —
            // preview a state below to see what it reveals. Renders nothing
            // itself; its states just gate the elementIds they list.
            {
              id: "search-results", label: "Search Results", type: "resultGroup", configurable: true, visible: true,
              elementType: "Template card", activeStateId: null,
              infoText: "List of different search results that appear on the screen when a user searches.",
              states: [
                { id: "no-beneficiary", name: "Beneficiary Not Found", elements: [{ id: "empty-state", required: true }] },
                {
                  id: "beneficiary-name-search", name: "Beneficiary Name Search",
                  elements: [
                    { id: "field-beneficiary-name", required: true },
                    { id: "btn-open", required: true },
                    { id: "field-member-in-house", required: false },
                    { id: "field-location", required: false },
                    { id: "field-coordinates", required: false },
                    { id: "table-member-details", required: false }
                  ]
                },
                {
                  id: "beneficiary-id-search", name: "Beneficiary ID Search",
                  elements: [
                    { id: "field-beneficiary-id", required: true },
                    { id: "btn-open", required: true },
                    { id: "field-member-in-house", required: false },
                    { id: "field-location", required: false },
                    { id: "field-coordinates", required: false },
                    { id: "table-member-details", required: false }
                  ]
                }
              ]
            },
            {
              id: "empty-state", label: "Beneficiary Not Found", type: "emptyState", configurable: false, visible: true,
              icon: "search-warn", title: "Beneficiary not found!",
              message: "We couldn't find this beneficiary in the records. You can add them as a new beneficiary.",
              elementType: "noResultCard"
            },
            // Outer white card for the "beneficiary found" result — name +
            // Open action, then a few summary lines, then the member table.
            { id: "field-beneficiary-name", label: "Beneficiary Name", type: "textTemplate", configurable: true, visible: true, value: "Beneficiary Name", variant: "heading", outerCard: true, elementType: "Template text" },
            // Beneficiary ID Search shows this scanned-ID heading instead of
            // the name heading — its own element, so renaming/toggling it
            // never affects the Beneficiary Name Search state. Placed right
            // before "Open" (same as the name field) so "Open" pairs inline
            // with whichever heading is actually showing.
            { id: "field-beneficiary-id", label: "Beneficiary ID", type: "textTemplate", configurable: true, visible: true, value: "Beneficiary ID", variant: "heading", outerCard: true, elementType: "Template text" },
            { id: "btn-open", label: "Open", type: "button", configurable: true, visible: true, text: "Open", style: "outline", contextual: true, inlineWithText: true, outerCard: true, ctaGroup: "General actions", elementType: "Button" },
            // These show as plain dynamic text at this position in the real
            // app — no visible "Label:" prefix, unlike Household Head/Member
            // Count on the Household Overview screen, which do pair a label.
            { id: "field-member-in-house", label: "Member in House", type: "textTemplate", configurable: true, visible: true, variant: "plain", outerCard: true, elementType: "Template text" },
            { id: "field-location", label: "Location", type: "textTemplate", configurable: true, visible: true, variant: "plain", outerCard: true, elementType: "Template text" },
            { id: "field-coordinates", label: "Coordinates", type: "textTemplate", configurable: true, visible: true, value: "Cordinates", variant: "caption", outerCard: true, elementType: "Template text" },
            {
              id: "table-member-details", label: "Household Table", type: "table", configurable: true, visible: true, outerCard: true, elementType: "Table",
              // Each column can be switched on/off independently, in
              // addition to the whole table's own visibility toggle.
              columns: [
                { label: "Name", enabled: true },
                { label: "Age", enabled: true },
                { label: "Gender", enabled: true },
                { label: "Beneficiary ID", enabled: true }
              ],
              rows: []
            },
            { id: "btn-register", label: "Register New Beneficiary", type: "button", configurable: true, visible: true, text: "Register New Beneficiary", style: "primary", icon: "person-add", triggersPopup: "popup-low-beneficiary-id", ctaGroup: "Registration actions", elementType: "Button" },
            { id: "btn-scan", label: "Scan Beneficiary Voucher", type: "button", configurable: true, visible: true, text: "Scan Beneficiary Voucher", style: "outline", icon: "qr", ctaGroup: "Registration actions", elementType: "QR Scan" },
            // Shown when Download Beneficiary IDs' own logic condition
            // (Beneficiary ID from MDMS is less than 10) is met — its own
            // "Popups" section in Page Properties, title/description editable.
            {
              id: "popup-low-beneficiary-id", label: "Low Beneficiary ID", type: "popup", configurable: true, visible: false, peek: true, elementType: "Alert Popup",
              title: "Low beneficiary ID count",
              message: "Fewer than 10 beneficiary IDs are available. Download the remaining IDs before registering new beneficiaries."
            },
            // These belong to the popup above (popupId), not the page — they
            // render inside its overlay card, not in the main Buttons list.
            { id: "btn-popup-download-id", label: "Download ID", type: "button", configurable: true, visible: true, text: "Download ID", style: "primary", popupId: "popup-low-beneficiary-id" },
            { id: "btn-popup-skip", label: "Skip", type: "button", configurable: true, visible: true, text: "Skip", style: "outline", popupId: "popup-low-beneficiary-id" },
            // Shown when "Filter" is clicked — a peek popup, same mechanism
            // as Low Beneficiary ID, just with no button "replacing" to
            // swap in for since Filter itself is always shown.
            {
              id: "popup-filter", label: "Filter", type: "popup", configurable: true, visible: false, peek: true, elementType: "Filter Popup",
              title: "Filter",
              // Each option can be switched off from Page Properties
              // instead of the popup showing a generic Title/Description
              // to edit — there's no free text here, just which of these
              // show up as filter checkboxes.
              filterOptions: [
                { label: "Not Eligible", enabled: true },
                { label: "Beneficiary Referred", enabled: true },
                { label: "Administered Successfully", enabled: true },
                { label: "Redose Completed", enabled: true },
                { label: "Not Administered", enabled: true }
              ]
            },
            { id: "btn-filter-apply", label: "Apply Filters", type: "button", configurable: true, visible: true, text: "Apply Filters", style: "primary", popupId: "popup-filter" },
            { id: "btn-filter-clear", label: "Clear", type: "button", configurable: true, visible: true, text: "Clear", style: "outline", popupId: "popup-filter" }
          ]
        },
        {
          id: "household-details",
          name: "Household Details",
          badge: "Fully Configurable",
          pageHeading: "Household Details",
          pageDescription: "Capture household information for the beneficiary",
          elements: [
            { id: "field-head-name", label: "Head of Household Name", type: "field", configurable: true, visible: true, inputType: "text", required: true, group: "Household Information" },
            { id: "field-address", label: "Address", type: "field", configurable: true, visible: true, inputType: "text", required: true, group: "Household Information" },
            { id: "field-members", label: "No. of Members", type: "field", configurable: true, visible: true, inputType: "number", group: "Household Information" },
            { id: "field-locality", label: "Locality", type: "field", configurable: true, visible: true, inputType: "select", required: true, group: "Administrative area" },
            {
              id: "field-latlong", label: "Lat/Long", type: "field", configurable: true, visible: true, inputType: "text",
              fieldType: "Coordinates", group: "Administrative area",
              helpTextEnabled: true, helpText: "Provide latitude and longitude of the address, if available.",
              tooltipEnabled: false
            },
            { id: "btn-continue", label: "Continue", type: "button", configurable: false, visible: true, text: "Continue", style: "primary" }
          ]
        },
        {
          id: "household-overview",
          name: "Household Overview",
          badge: "Partially Configurable",
          pageHeading: "Household Overview",
          pageDescription: "Overview of the household, its members, and associated details",
          elements: [
            // Sits directly on the page background, above the card.
            { id: "btn-edit-household", label: "Edit Household", type: "button", configurable: true, visible: true, text: "Edit Household", style: "outline", contextual: true, compact: true, icon: "edit", ctaGroup: "General actions", elementType: "Button" },

            // Outer white card: household summary + the member card nested inside it.
            {
              id: "household-details-pairs", label: "Household Details", type: "labelPairList", configurable: true, visible: true, noToggle: true, elementType: "Template text", outerCard: true,
              pairs: [
                { label: "Household Head", enabled: true },
                { label: "Member Count", enabled: true }
              ]
            },
            // Nested gray "member" card, inside the outer white card.
            { id: "field-member-name", label: "Member Name", type: "textTemplate", configurable: true, visible: true, noToggle: true, value: "Member Name", variant: "heading", outerCard: true, innerCard: true, elementType: "Template text" },
            { id: "btn-edit-individual", label: "Edit Individual", type: "button", configurable: true, visible: true, text: "Edit", style: "tertiary", contextual: true, icon: "edit", inlineWithText: true, outerCard: true, innerCard: true, ctaGroup: "General actions", elementType: "Button" },
            // Gender and Age are separate configurable attributes, shown
            // joined on one line ("Gender | Age") — see joinNext.
            { id: "field-gender", label: "Gender", type: "textTemplate", configurable: true, visible: true, variant: "caption", joinNext: true, outerCard: true, innerCard: true, elementType: "Template text" },
            { id: "field-age", label: "Age", type: "textTemplate", configurable: true, visible: true, variant: "caption", outerCard: true, innerCard: true, elementType: "Template text" },
            { id: "tag-beneficiary-id", label: "Beneficiary ID", type: "tag", configurable: true, visible: true, tagStyle: "id", outerCard: true, innerCard: true, elementType: "Template tag" },
            // A dynamic value with multiple STATES: at runtime exactly one of
            // these five applies to a given member, so the canvas shows only
            // one at a time (the generic label by default, when
            // activeStateId is null — see "Types of Delivery Status" in the
            // drawer to preview each one). Each state also controls which
            // action buttons appear below it — see elementIds.
            {
              id: "delivery-status", label: "Delivery Status", type: "tag", configurable: true, visible: true,
              elementType: "Template tag", outerCard: true, innerCard: true, activeStateId: null,
              infoText: "A predefined list of possible delivery outcomes for a member.",
              states: [
                { id: "not-eligible", name: "Not Eligible", tagStyle: "danger", elementIds: [], logic: dummyLogic("Not Eligible") },
                { id: "beneficiary-referred", name: "Beneficiary Referred", tagStyle: "warning", elementIds: [], logic: dummyLogic("Beneficiary Referred") },
                { id: "administered-successfully", name: "Administered Successfully", tagStyle: "success", elementIds: ["btn-redose", "btn-view-delivery-details"], logic: dummyLogic("Administered Successfully") },
                { id: "redose-completed", name: "Redose Completed", tagStyle: "info", elementIds: ["btn-view-redose-detail"], logic: dummyLogic("Redose Completed") },
                { id: "not-administered", name: "Not Administered", tagStyle: "neutral", elementIds: ["btn-deliver-intervention", "btn-unable-to-deliver"], logic: dummyLogic("Not Administered") }
              ]
            },
            { id: "btn-deliver-intervention", label: "Deliver Intervention", type: "button", configurable: true, visible: true, text: "Record Delivery", style: "primary", contextual: true, outerCard: true, innerCard: true, ctaGroup: "Delivery actions", elementType: "Button" },
            { id: "btn-unable-to-deliver", label: "Unable To Deliver", type: "button", configurable: true, visible: true, text: "Unable to Deliver", style: "outline", contextual: true, outerCard: true, innerCard: true, ctaGroup: "Delivery actions", elementType: "Button" },
            { id: "btn-redose", label: "Redose", type: "button", configurable: true, visible: true, text: "Redose", style: "primary", contextual: true, outerCard: true, innerCard: true, ctaGroup: "Post-delivery actions", elementType: "Button" },
            { id: "btn-view-delivery-details", label: "View Delivery Details", type: "button", configurable: true, visible: true, text: "View Delivery Details", style: "outline", contextual: true, outerCard: true, innerCard: true, ctaGroup: "Post-delivery actions", elementType: "Button" },
            { id: "btn-view-redose-detail", label: "View Redose Detail", type: "button", configurable: true, visible: true, text: "View Redose Detail", style: "outline", contextual: true, outerCard: true, innerCard: true, ctaGroup: "Post Redose Actions", elementType: "Button" },

            // A card-level action, not member-specific — sits inside the
            // outer white card (like Household Details) but outside the
            // gray member sub-card, below the member's own action buttons.
            { id: "btn-add-members", label: "Add Members", type: "button", configurable: true, visible: true, text: "Add Member", style: "tertiary", icon: "add-circle", contextual: true, outerCard: true, ctaGroup: "General actions", elementType: "Action popup" }
          ]
        },
        {
          id: "member-details",
          name: "Member Details",
          badge: "Fully Configurable",
          pageHeading: "Member Details",
          pageDescription: "Enter individual member details",
          elements: [
            { id: "field-name", label: "Full Name", type: "field", configurable: true, visible: true, inputType: "text", required: true, group: "Personal Information" },
            { id: "field-age", label: "Age", type: "field", configurable: true, visible: true, inputType: "number", group: "Personal Information" },
            { id: "field-gender", label: "Gender", type: "field", configurable: true, visible: true, inputType: "select", group: "Personal Information" },
            { id: "btn-save-member", label: "Save Member", type: "button", configurable: false, visible: true, text: "Save Member", style: "primary" }
          ]
        },
        {
          id: "unable-to-deliver",
          name: "Unable to deliver",
          badge: "Partially Configurable",
          pageHeading: "Unable to Deliver",
          pageDescription: "Record the reason delivery could not be completed",
          elements: [
            { id: "field-reason", label: "Reason", type: "field", configurable: true, visible: true, inputType: "select", required: true, group: "Delivery Status" },
            { id: "btn-submit-reason", label: "Submit", type: "button", configurable: false, visible: true, text: "Submit", style: "primary" }
          ]
        }
      ]
    },
    {
      key: "delivery",
      label: "Delivery",
      screens: [
        {
          id: "vaccination-summary",
          name: "Vaccination Summary",
          badge: "Partially Configurable",
          pageHeading: "Vaccination Summary",
          pageDescription: "Review the beneficiary details and vaccination history.",
          elements: [
            {
              id: "vaccination-beneficiary-details", label: "Beneficiary Details", type: "labelPairList", configurable: true, visible: true, noToggle: true, elementType: "Template text", outerCard: true, cardGroup: "details",
              pairs: [
                { label: "Name", enabled: true },
                { label: "Age", enabled: true },
                { label: "Gender", enabled: true },
                { label: "Registration date", enabled: true }
              ]
            },
            // Single and multi cycle show different history, so this works
            // like Search Results: no table by default (the tinted
            // placeholder), and previewing a type reveals its tables.
            {
              id: "vaccination-history", label: "Vaccination History", type: "resultGroup", configurable: true, visible: true,
              elementType: "Template card", activeStateId: null,
              infoText: "Single cycle and multi cycle both show the last vaccination details; multi cycle also shows Show More.",
              states: [
                { id: "single-cycle", name: "Single Cycle", elements: [{ id: "table-last-vaccination", required: true }] },
                { id: "multi-cycle", name: "Multi Cycle", elements: [{ id: "table-vaccination-cycle-1", required: true }] }
              ]
            },
            {
              id: "table-last-vaccination", label: "Last vaccination details", type: "table", configurable: true, visible: true, outerCard: true, cardGroup: "single", title: "Last vaccination details", elementType: "Table",
              columns: [
                { label: "Vaccination no.", enabled: true },
                { label: "Status", enabled: true }
              ],
              rows: []
            },
            {
              id: "table-vaccination-cycle-1", label: "Last vaccination details", type: "table", configurable: true, visible: true, outerCard: true, cardGroup: "cycle-1", title: "Last vaccination details", showMore: true, elementType: "Table",
              columns: [
                { label: "Vaccination no.", enabled: true },
                { label: "Status", enabled: true }
              ],
              rows: []
            },
            { id: "btn-vaccinate", label: "Vaccinate", type: "button", configurable: true, visible: true, text: "Vaccinate", style: "primary", ctaGroup: "Delivery actions", elementType: "Button" }
          ]
        },
        {
          id: "eligibility-assessment",
          name: "Eligibility Assessment",
          badge: "Fully Configurable",
          pageHeading: "Eligibility Assessment",
          pageDescription: "Assess beneficiary eligibility for the current delivery cycle",
          elements: [
            { id: "field-question-1", label: "Eligibility Question 1", type: "field", configurable: true, visible: true, inputType: "select", required: true, group: "Eligibility Questions" },
            { id: "field-question-2", label: "Eligibility Question 2", type: "field", configurable: true, visible: true, inputType: "select", required: true, group: "Eligibility Questions" },
            { id: "btn-assess-continue", label: "Continue", type: "button", configurable: false, visible: true, text: "Continue", style: "primary" }
          ]
        },
        {
          id: "beneficiary-details",
          name: "Delivery Details",
          badge: "Partially Configurable",
          pageHeading: "Delivery Details",
          pageDescription: "Confirm beneficiary details before recording delivery",
          elements: [
            { id: "card-beneficiary", label: "Beneficiary Card", type: "card", configurable: true, visible: true, title: "Jane Doe", subtitle: "Beneficiary ID: SMC-00123", elementType: "Template text" },
            { id: "btn-details-continue", label: "Continue", type: "button", configurable: false, visible: true, text: "Continue", style: "primary" }
          ]
        },
        {
          id: "delivery-details",
          name: "Delivery Details",
          badge: "Fully Configurable",
          pageHeading: "Delivery Details",
          pageDescription: "Capture the details of the commodity delivered",
          elements: [
            { id: "field-dose", label: "Dose Administered", type: "field", configurable: true, visible: true, inputType: "select", required: true, group: "Delivery Information" },
            { id: "field-quantity", label: "Quantity", type: "field", configurable: true, visible: true, inputType: "number", group: "Delivery Information" },
            { id: "btn-confirm-delivery", label: "Confirm Delivery", type: "button", configurable: false, visible: true, text: "Confirm Delivery", style: "primary" }
          ]
        },
        {
          id: "delivery-success",
          name: "Delivery Success",
          badge: "Locked",
          pageHeading: "Delivery Successful",
          pageDescription: "Confirmation shown after a successful delivery",
          elements: [
            { id: "success-icon", label: "Success Message", type: "success", configurable: false, visible: true, message: "Delivery recorded successfully" },
            { id: "btn-done", label: "Done", type: "button", configurable: false, visible: true, text: "Done", style: "primary" }
          ]
        }
      ]
    },
    {
      key: "referral",
      label: "Referral",
      screens: [
        {
          id: "refer-beneficiary",
          name: "Refer Beneficiary",
          badge: "Partially Configurable",
          pageHeading: "Refer Beneficiary",
          pageDescription: "Refer this beneficiary to a facility for further care",
          elements: [
            { id: "field-facility", label: "Referral Facility", type: "field", configurable: true, visible: true, inputType: "select", required: true, group: "Referral Information" },
            { id: "field-reason-referral", label: "Reason for Referral", type: "field", configurable: true, visible: true, inputType: "text", required: true, group: "Referral Information" },
            { id: "btn-submit-referral", label: "Submit Referral", type: "button", configurable: false, visible: true, text: "Submit Referral", style: "primary" }
          ]
        },
        {
          id: "referral-success",
          name: "Referral Success",
          badge: "Locked",
          pageHeading: "Referral Submitted",
          pageDescription: "Confirmation shown after a successful referral",
          elements: [
            { id: "success-icon", label: "Success Message", type: "success", configurable: false, visible: true, message: "Referral submitted successfully" },
            { id: "btn-done-referral", label: "Done", type: "button", configurable: false, visible: true, text: "Done", style: "primary" }
          ]
        }
      ]
    },
    {
      key: "redose",
      label: "Redose Category",
      screens: [
        {
          id: "redose-details",
          name: "Redose Details",
          badge: "Fully Configurable",
          pageHeading: "Redose Details",
          pageDescription: "Capture details for a redose administration",
          elements: [
            { id: "field-redose-reason", label: "Redose Reason", type: "field", configurable: true, visible: true, inputType: "select", required: true, group: "Redose Information" },
            { id: "btn-submit-redose", label: "Submit", type: "button", configurable: false, visible: true, text: "Submit", style: "primary" }
          ]
        },
        {
          id: "redose-success",
          name: "Redose Success",
          badge: "Locked",
          pageHeading: "Redose Recorded",
          pageDescription: "Confirmation shown after a successful redose",
          elements: [
            { id: "success-icon", label: "Success Message", type: "success", configurable: false, visible: true, message: "Redose recorded successfully" },
            { id: "btn-done-redose", label: "Done", type: "button", configurable: false, visible: true, text: "Done", style: "primary" }
          ]
        }
      ]
    }
  ]
};
