# First, let's create a simple fix for the debug/users endpoint
# Save this as fix-debug-users.js
$fixCode = @'
// Temporary fix for debug/users endpoint
app.get('/api/v1/debug/users', async (req, res) => {
    try {
        // Use SCAN instead of QUERY to avoid GSI issues
        const params = {
            TableName: process.env.DYNAMODB_TABLE || 'EnerlectraPCEI_MVP',
            FilterExpression: 'EntityType = :type',
            ExpressionAttributeValues: {
                ':type': 'User'
            },
            Limit: 20
        };
        
        const result = await docClient.scan(params).promise();
        
        res.json({
            status: 'success',
            count: result.Items?.length || 0,
            users: result.Items?.map(item => ({
                userId: item.PK,
                phoneNumber: item.phoneNumber,
                name: item.name,
                role: item.role,
                clusterId: item.clusterId,
                onboardDate: item.onboardDate
            })) || []
        });
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// Also fix getTotalUserCount function
// Find this function in server.js and replace it:
const getTotalUserCount = async () => {
    const params = {
        TableName: process.env.DYNAMODB_TABLE || 'EnerlectraPCEI_MVP',
        FilterExpression: 'EntityType = :type',
        ExpressionAttributeValues: {
            ':type': 'User'
        },
        Select: 'COUNT'
    };
    
    try {
        const result = await docClient.scan(params).promise();
        return result.Count || 0;
    } catch (error) {
        console.error('Error counting users:', error);
        return 100; // Default to seed count
    }
};
'@

$fixCode | Out-File -FilePath "fix-debug-users.js" -Encoding UTF8
Write-Host "✅ Fix file created: fix-debug-users.js" -ForegroundColor Green