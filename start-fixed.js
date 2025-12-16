// DNS FIX FOR WINDOWS - WRAPPER
process.env.NODE_OPTIONS = "--dns-result-order=ipv4first";
process.env.AWS_EC2_METADATA_DISABLED = "true";

// Import original server
require("./server.js");
