/**
 * Express API Routes for MedGemma 4B Integration
 * 
 * This file provides Express.js routes for integrating with the MedGemma pipeline.
 * Can be used with a standalone Express server or integrated into existing Express apps.
 */

const express = require('express');
const router = express.Router();
const { runMedGemmaPipeline } = require('../services/medgemmaAgent');

/**
 * Medicine Analysis Endpoint
 * POST /analyze-medicine
 * 
 * Analyzes medicine images using MedGemma 4B with NPRA database integration
 * Requires authentication and consumes user tokens
 */
router.post('/analyze-medicine', async (req, res) => {
    console.log('🔍 Medicine Analysis API Request received');
    
    try {
        // Extract request parameters
        const { image_data, user_id, text_query } = req.body;
        
        // Validate required parameters
        if (!image_data && !text_query) {
            console.log('❌ Missing required parameters: image_data or text_query');
            return res.status(400).json({ 
                status: "ERROR", 
                message: "Image data or text query is required." 
            });
        }
        
        // CRITICAL: Ensure user_id is passed for the token check
        if (!user_id) {
            console.log('❌ Missing user_id for authentication');
            return res.status(401).json({ 
                status: "ERROR", 
                message: "Authentication required (user_id missing)." 
            });
        }

        console.log(`🚀 Starting MedGemma pipeline for user: ${user_id}`);
        
        // Call the final, cost-optimized pipeline
        const result = await runMedGemmaPipeline(image_data, text_query, user_id);
        
        console.log(`📊 Pipeline result status: ${result.status}`);
        
        if (result.status === "ERROR") {
            // Return 402 for token issues, 500 for other backend errors
            const statusCode = result.message.includes('tokens') ? 402 : 500;
            console.log(`❌ Pipeline error (${statusCode}): ${result.message}`);
            return res.status(statusCode).json(result);
        }

        console.log('✅ Pipeline completed successfully');
        
        // Send the final structured JSON back to the client
        res.json(result.data);

    } catch (error) {
        console.error("❌ API Route Error:", error);
        res.status(500).json({ 
            status: "ERROR", 
            message: "Internal server error during medicine analysis." 
        });
    }
});

/**
 * Health Check Endpoint
 * GET /health
 */
router.get('/health', (req, res) => {
    res.json({ 
        status: "OK", 
        message: "MedGemma API is running",
        timestamp: new Date().toISOString()
    });
});

/**
 * Token Status Endpoint
 * GET /token-status/:userId
 * 
 * Check user's current token balance without consuming tokens
 */
router.get('/token-status/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        
        if (!userId) {
            return res.status(400).json({ 
                status: "ERROR", 
                message: "User ID is required" 
            });
        }
        
        // Import the Supabase client for token checking
        const { createClient } = require('@supabase/supabase-js');
        const SUPABASE_URL = process.env.SUPABASE_URL;
        const SUPABASE_KEY = process.env.SUPABASE_KEY;
        const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
        
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('token_count, updated_at')
            .eq('id', userId)
            .single();
        
        if (error) {
            console.error('Token status check error:', error);
            return res.status(500).json({ 
                status: "ERROR", 
                message: "Failed to check token status" 
            });
        }
        
        res.json({
            status: "SUCCESS",
            data: {
                user_id: userId,
                token_count: profile?.token_count || 0,
                last_updated: profile?.updated_at
            }
        });
        
    } catch (error) {
        console.error('Token status endpoint error:', error);
        res.status(500).json({ 
            status: "ERROR", 
            message: "Internal server error" 
        });
    }
});

module.exports = router;
