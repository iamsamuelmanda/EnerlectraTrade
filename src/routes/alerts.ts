import { Router, Request, Response } from 'express';
import { readJsonFile, writeJsonFile, findUserByPhone, generateId } from '../utils/common';
import { User, Cluster, Transaction, USSDRequest, USSDResponse, ApiResponse } from '../types';

const router = Router();

interface PriceAlert {
  id: string;
  userId: string;
  phoneNumber: string;
  type: 'price_drop' | 'price_rise' | 'low_supply' | 'high_demand';
  targetPrice?: number;
  clusterId?: string;
  isActive: boolean;
  createdAt: string;
  triggeredAt?: string;
  message?: string;
}

interface NotificationHistory {
  id: string;
  phoneNumber: string;
  type: 'price_alert' | 'system_alert' | 'transaction_alert';
  message: string;
  timestamp: string;
  delivered: boolean;
}

// POST /alerts/subscribe - Subscribe to price alerts
router.post('/subscribe', (req: Request, res: Response) => {
  try {
    const { userId, phoneNumber, type, targetPrice, clusterId } = req.body;

    if (!userId || !phoneNumber || !type) {
      const response: ApiResponse = {
        success: false,
        error: 'userId, phoneNumber, and alert type are required'
      };
      return res.status(400).json(response);
    }

    const validTypes = ['price_drop', 'price_rise', 'low_supply', 'high_demand'];
    if (!validTypes.includes(type)) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid alert type. Must be: price_drop, price_rise, low_supply, or high_demand'
      };
      return res.status(400).json(response);
    }

    const users = readJsonFile<User>('users.json');
    const user = users.find(u => u.id === userId);

    if (!user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not found'
      };
      return res.status(404).json(response);
    }

    // Validate cluster if specified
    if (clusterId) {
      const clusters = readJsonFile<Cluster>('clusters.json');
      const cluster = clusters.find(c => c.id === clusterId);
      if (!cluster) {
        const response: ApiResponse = {
          success: false,
          error: 'Cluster not found'
        };
        return res.status(404).json(response);
      }
    }

    const priceAlerts = readJsonFile<PriceAlert>('price_alerts.json');

    const newAlert: PriceAlert = {
      id: generateId(),
      userId,
      phoneNumber,
      type,
      targetPrice,
      clusterId,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    priceAlerts.push(newAlert);
    writeJsonFile('price_alerts.json', priceAlerts);

    const response: ApiResponse = {
      success: true,
      data: {
        alertId: newAlert.id,
        type: newAlert.type,
        targetPrice: newAlert.targetPrice,
        clusterId: newAlert.clusterId,
        isActive: newAlert.isActive,
        createdAt: newAlert.createdAt
      },
      message: 'Price alert subscription created successfully'
    };

    res.status(201).json(response);
  } catch (error) {
    console.error('Subscribe alert error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

// GET /alerts/:userId - Get user's active alerts
router.get('/:userId', (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    
    const users = readJsonFile<User>('users.json');
    const user = users.find(u => u.id === userId);

    if (!user) {
      const response: ApiResponse = {
        success: false,
        error: 'User not found'
      };
      return res.status(404).json(response);
    }

    const priceAlerts = readJsonFile<PriceAlert>('price_alerts.json');
    const userAlerts = priceAlerts.filter(alert => alert.userId === userId);
    const clusters = readJsonFile<Cluster>('clusters.json');

    const alertsWithDetails = userAlerts.map(alert => {
      const cluster = alert.clusterId ? clusters.find(c => c.id === alert.clusterId) : null;
      return {
        ...alert,
        clusterName: cluster ? cluster.location : 'All clusters',
        currentPrice: cluster ? cluster.pricePerKWh : null
      };
    });

    const response: ApiResponse = {
      success: true,
      data: {
        alerts: alertsWithDetails,
        summary: {
          totalAlerts: userAlerts.length,
          activeAlerts: userAlerts.filter(a => a.isActive).length,
          triggeredAlerts: userAlerts.filter(a => a.triggeredAt).length
        }
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Get alerts error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

// DELETE /alerts/:alertId - Unsubscribe from alert
router.delete('/:alertId', (req: Request, res: Response) => {
  try {
    const { alertId } = req.params;
    const { userId } = req.body;

    if (!userId) {
      const response: ApiResponse = {
        success: false,
        error: 'userId is required'
      };
      return res.status(400).json(response);
    }

    const priceAlerts = readJsonFile<PriceAlert>('price_alerts.json');
    const alertIndex = priceAlerts.findIndex(a => a.id === alertId && a.userId === userId);

    if (alertIndex === -1) {
      const response: ApiResponse = {
        success: false,
        error: 'Alert not found or unauthorized'
      };
      return res.status(404).json(response);
    }

    priceAlerts[alertIndex].isActive = false;
    writeJsonFile('price_alerts.json', priceAlerts);

    const response: ApiResponse = {
      success: true,
      message: 'Alert unsubscribed successfully'
    };

    res.json(response);
  } catch (error) {
    console.error('Unsubscribe alert error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

// POST /alerts/check - Check and trigger alerts (internal/cron endpoint)
router.post('/check', (req: Request, res: Response) => {
  try {
    const priceAlerts = readJsonFile<PriceAlert>('price_alerts.json');
    const clusters = readJsonFile<Cluster>('clusters.json');
    const transactions = readJsonFile<Transaction>('transactions.json');
    const notificationHistory = readJsonFile<NotificationHistory>('notification_history.json');

    const triggeredAlerts: any[] = [];
    const now = new Date().toISOString();

    // Calculate market conditions
    const totalCapacity = clusters.reduce((sum, c) => sum + c.capacityKWh, 0);
    const totalAvailable = clusters.reduce((sum, c) => sum + c.availableKWh, 0);
    const utilizationRate = ((totalCapacity - totalAvailable) / totalCapacity) * 100;

    // Recent price activity
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentTransactions = transactions.filter(t => 
      new Date(t.timestamp) > oneHourAgo && t.type === 'trade'
    );
    
    const currentAveragePrice = recentTransactions.length > 0 ? 
      recentTransactions.reduce((sum, t) => sum + t.amountZMW, 0) / 
      recentTransactions.reduce((sum, t) => sum + t.kWh, 0) : 1.2;

    for (const alert of priceAlerts) {
      if (!alert.isActive || alert.triggeredAt) continue;

      let shouldTrigger = false;
      let alertMessage = '';

      const cluster = alert.clusterId ? clusters.find(c => c.id === alert.clusterId) : null;
      const relevantPrice = cluster ? cluster.pricePerKWh : currentAveragePrice;

      switch (alert.type) {
        case 'price_drop':
          if (alert.targetPrice && relevantPrice <= alert.targetPrice) {
            shouldTrigger = true;
            alertMessage = `🔽 Price Alert: Energy price dropped to ${relevantPrice} ZMW/kWh${cluster ? ` at ${cluster.location}` : ''}! Target: ${alert.targetPrice} ZMW/kWh`;
          }
          break;

        case 'price_rise':
          if (alert.targetPrice && relevantPrice >= alert.targetPrice) {
            shouldTrigger = true;
            alertMessage = `📈 Price Alert: Energy price rose to ${relevantPrice} ZMW/kWh${cluster ? ` at ${cluster.location}` : ''}! Target: ${alert.targetPrice} ZMW/kWh`;
          }
          break;

        case 'low_supply':
          const clusterLowSupply = cluster && (cluster.availableKWh / cluster.capacityKWh) < 0.2;
          const systemLowSupply = (totalAvailable / totalCapacity) < 0.2;
          
          if (clusterLowSupply || (!cluster && systemLowSupply)) {
            shouldTrigger = true;
            alertMessage = `⚠️ Supply Alert: Low energy supply detected${cluster ? ` at ${cluster.location}` : ' system-wide'}. Buy now before prices rise!`;
          }
          break;

        case 'high_demand':
          const clusterHighDemand = cluster && (cluster.availableKWh / cluster.capacityKWh) < 0.3;
          const systemHighDemand = utilizationRate > 70;
          
          if (clusterHighDemand || (!cluster && systemHighDemand)) {
            shouldTrigger = true;
            alertMessage = `🔥 Demand Alert: High energy demand detected${cluster ? ` at ${cluster.location}` : ' system-wide'}. Consider selling your energy!`;
          }
          break;
      }

      if (shouldTrigger) {
        // Mark alert as triggered
        const alertIndex = priceAlerts.findIndex(a => a.id === alert.id);
        priceAlerts[alertIndex].triggeredAt = now;
        priceAlerts[alertIndex].message = alertMessage;

        // Add to notification history
        const notification: NotificationHistory = {
          id: generateId(),
          phoneNumber: alert.phoneNumber,
          type: 'price_alert',
          message: alertMessage,
          timestamp: now,
          delivered: true // Simulated delivery
        };

        notificationHistory.push(notification);
        triggeredAlerts.push({
          alertId: alert.id,
          phoneNumber: alert.phoneNumber,
          type: alert.type,
          message: alertMessage
        });
      }
    }

    // Save changes
    writeJsonFile('price_alerts.json', priceAlerts);
    writeJsonFile('notification_history.json', notificationHistory);

    const response: ApiResponse = {
      success: true,
      data: {
        alertsChecked: priceAlerts.filter(a => a.isActive && !a.triggeredAt).length,
        alertsTriggered: triggeredAlerts.length,
        triggeredAlerts,
        marketConditions: {
          utilizationRate: Math.round(utilizationRate * 100) / 100,
          averagePrice: Math.round(currentAveragePrice * 100) / 100,
          lowSupplyAlert: (totalAvailable / totalCapacity) < 0.2,
          highDemandAlert: utilizationRate > 70
        }
      },
      message: `Alert check completed: ${triggeredAlerts.length} alerts triggered`
    };

    res.json(response);
  } catch (error) {
    console.error('Check alerts error:', error);
    const response: ApiResponse = {
      success: false,
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

// POST /alerts/ussd - USSD interface for managing alerts
router.post('/ussd', (req: Request, res: Response) => {
  try {
    const { text, phoneNumber }: USSDRequest = req.body;

    if (!phoneNumber) {
      const response: ApiResponse<USSDResponse> = {
        success: false,
        error: 'Phone number is required'
      };
      return res.status(400).json(response);
    }

    const users = readJsonFile<User>('users.json');
    const user = findUserByPhone(users, phoneNumber);

    if (!user) {
      const response: ApiResponse<USSDResponse> = {
        success: false,
        data: {
          text: 'END User not found. Please register first.',
          continueSession: false
        }
      };
      return res.json(response);
    }

    let ussdResponse: USSDResponse;
    const menuPath = text || '';
    const menuLevels = menuPath.split('*').filter(level => level !== '');

    switch (menuLevels.length) {
      case 0:
        // Main alerts menu
        ussdResponse = {
          text: `CON Energy Alerts\nHello ${user.name}\n\n1. Set Price Alert\n2. View My Alerts\n3. Market Alerts\n4. Alert History\n0. Exit`,
          continueSession: true
        };
        break;

      case 1:
        switch (menuLevels[0]) {
          case '1':
            // Set price alert
            ussdResponse = {
              text: `CON Set Price Alert:\n\n1. Price Drop Alert\n2. Price Rise Alert\n3. Low Supply Alert\n4. High Demand Alert\n0. Back`,
              continueSession: true
            };
            break;

          case '2':
            // View alerts
            const priceAlerts = readJsonFile<PriceAlert>('price_alerts.json');
            const userAlerts = priceAlerts.filter(a => a.userId === user.id && a.isActive);
            
            let alertsText = 'END Your Active Alerts:\n\n';
            if (userAlerts.length === 0) {
              alertsText += 'No active alerts.\nUse option 1 to create alerts.';
            } else {
              userAlerts.slice(0, 5).forEach((alert, i) => {
                alertsText += `${i + 1}. ${alert.type.replace('_', ' ').toUpperCase()}\n`;
                if (alert.targetPrice) alertsText += `   Target: ${alert.targetPrice} ZMW/kWh\n`;
                alertsText += `   Created: ${new Date(alert.createdAt).toLocaleDateString()}\n`;
              });
            }

            ussdResponse = {
              text: alertsText,
              continueSession: false
            };
            break;

          case '3':
            // Market alerts
            const clusters = readJsonFile<Cluster>('clusters.json');
            const totalCapacity = clusters.reduce((sum, c) => sum + c.capacityKWh, 0);
            const totalAvailable = clusters.reduce((sum, c) => sum + c.availableKWh, 0);
            const utilizationRate = ((totalCapacity - totalAvailable) / totalCapacity) * 100;

            let marketText = 'END Market Status:\n\n';
            marketText += `System Utilization: ${utilizationRate.toFixed(1)}%\n\n`;
            
            if (utilizationRate > 80) {
              marketText += '🔥 HIGH DEMAND - Consider selling!\n';
            } else if (utilizationRate < 30) {
              marketText += '💰 LOW PRICES - Good time to buy!\n';
            } else {
              marketText += '📊 NORMAL ACTIVITY\n';
            }

            marketText += `\nTop Clusters:\n`;
            clusters.slice(0, 3).forEach(cluster => {
              const util = ((cluster.capacityKWh - cluster.availableKWh) / cluster.capacityKWh) * 100;
              marketText += `${cluster.location}: ${util.toFixed(0)}% used\n`;
            });

            ussdResponse = {
              text: marketText,
              continueSession: false
            };
            break;

          case '4':
            // Alert history
            const notificationHistory = readJsonFile<NotificationHistory>('notification_history.json');
            const userNotifications = notificationHistory
              .filter(n => n.phoneNumber === phoneNumber)
              .slice(-5);

            let historyText = 'END Recent Alerts:\n\n';
            if (userNotifications.length === 0) {
              historyText += 'No recent alerts.';
            } else {
              userNotifications.forEach((notif, i) => {
                historyText += `${i + 1}. ${notif.type.toUpperCase()}\n`;
                historyText += `   ${new Date(notif.timestamp).toLocaleDateString()}\n`;
              });
            }

            ussdResponse = {
              text: historyText,
              continueSession: false
            };
            break;

          case '0':
            ussdResponse = {
              text: `END Thank you for using Enerlectra Alerts!`,
              continueSession: false
            };
            break;

          default:
            ussdResponse = {
              text: `END Invalid option.`,
              continueSession: false
            };
        }
        break;

      case 2:
        if (menuLevels[0] === '1') {
          // Price alert type selected
          const alertTypes: Record<string, string> = {
            '1': 'price_drop',
            '2': 'price_rise',
            '3': 'low_supply',
            '4': 'high_demand'
          };

          const selectedType = alertTypes[menuLevels[1]];
          if (selectedType) {
            if (selectedType === 'price_drop' || selectedType === 'price_rise') {
              ussdResponse = {
                text: `CON ${selectedType.replace('_', ' ').toUpperCase()} Alert\n\nEnter target price (ZMW/kWh):\nCurrent avg: 1.20 ZMW/kWh\n\n(Example: 1.00)`,
                continueSession: true
              };
            } else {
              // For supply/demand alerts, no price needed
              const priceAlerts = readJsonFile<PriceAlert>('price_alerts.json');
              const newAlert: PriceAlert = {
                id: generateId(),
                userId: user.id,
                phoneNumber,
                type: selectedType as any,
                isActive: true,
                createdAt: new Date().toISOString()
              };

              priceAlerts.push(newAlert);
              writeJsonFile('price_alerts.json', priceAlerts);

              ussdResponse = {
                text: `END Alert Created! ✅\n\nType: ${selectedType.replace('_', ' ').toUpperCase()}\nStatus: Active\n\nYou'll receive SMS notifications when triggered.`,
                continueSession: false
              };
            }
          } else {
            ussdResponse = {
              text: `END Invalid alert type.`,
              continueSession: false
            };
          }
        } else {
          ussdResponse = {
            text: `END Session ended.`,
            continueSession: false
          };
        }
        break;

      case 3:
        if (menuLevels[0] === '1' && (menuLevels[1] === '1' || menuLevels[1] === '2')) {
          // Price alert with target price
          const targetPrice = parseFloat(menuLevels[2]);
          const alertType = menuLevels[1] === '1' ? 'price_drop' : 'price_rise';

          if (isNaN(targetPrice) || targetPrice <= 0 || targetPrice > 10) {
            ussdResponse = {
              text: `END Invalid price. Please enter a value between 0.01 and 10.00 ZMW/kWh.`,
              continueSession: false
            };
          } else {
            const priceAlerts = readJsonFile<PriceAlert>('price_alerts.json');
            const newAlert: PriceAlert = {
              id: generateId(),
              userId: user.id,
              phoneNumber,
              type: alertType as any,
              targetPrice,
              isActive: true,
              createdAt: new Date().toISOString()
            };

            priceAlerts.push(newAlert);
            writeJsonFile('price_alerts.json', priceAlerts);

            ussdResponse = {
              text: `END Alert Created! ✅\n\nType: ${alertType.replace('_', ' ').toUpperCase()}\nTarget: ${targetPrice} ZMW/kWh\nStatus: Active\n\nYou'll receive SMS when price ${alertType === 'price_drop' ? 'drops below' : 'rises above'} your target.`,
              continueSession: false
            };
          }
        } else {
          ussdResponse = {
            text: `END Session timeout.`,
            continueSession: false
          };
        }
        break;

      default:
        ussdResponse = {
          text: `END Session timeout. Please try again.`,
          continueSession: false
        };
    }

    const response: ApiResponse<USSDResponse> = {
      success: true,
      data: ussdResponse
    };

    res.json(response);
  } catch (error) {
    console.error('Alerts USSD error:', error);
    const response: ApiResponse<USSDResponse> = {
      success: false,
      data: {
        text: 'END Service temporarily unavailable. Please try again later.',
        continueSession: false
      },
      error: 'Internal server error'
    };
    res.status(500).json(response);
  }
});

export default router;
