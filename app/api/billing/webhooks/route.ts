// app/api/billing/webhooks/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
apiVersion: "2025-11-17.clover",
})

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || ''

export async function POST(request: NextRequest) {
  console.log('🔔 Webhook endpoint called!')
  
  try {
    const body = await request.text()
    const headersList = await headers()
    const signature = headersList.get('stripe-signature')

    if (!signature) {
      console.error('❌ No Stripe signature found')
      return NextResponse.json({ error: 'No signature' }, { status: 400 })
    }

    // Verify webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
      console.log('✅ Webhook verified:', event.type)
    } catch (err) {
      console.error('❌ Webhook signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    // For now, just log all events to see what's happening
    console.log(`🔔 Processing webhook: ${event.type}`)
    console.log(`📝 Event data:`, JSON.stringify(event.data.object, null, 2))

    const supabase = await createClient()

    switch (event.type) {
      case 'checkout.session.completed': {
        console.log('💳 Checkout completed!')
        const session = event.data.object as Stripe.Checkout.Session
        
        if (session.subscription) {
          console.log('🔄 Retrieving subscription...')
          const subscription = await stripe.subscriptions.retrieve(session.subscription as string)
          await handleSubscriptionCreated(supabase, subscription)
        }
        break
      }

      case 'customer.subscription.created': {
        console.log('📝 Subscription created!')
        const subscription = event.data.object as Stripe.Subscription
        await handleSubscriptionCreated(supabase, subscription)
        break
      }

      case 'invoice.payment_succeeded': {
        console.log('💰 Payment succeeded!')
        // We'll handle this later
        break
      }

      default:
        console.log(`🤷 Unhandled webhook event: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('❌ Webhook error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handleSubscriptionCreated(supabase: SupabaseClient, subscription: Stripe.Subscription) {
  console.log('🔧 Processing subscription creation...')
  
  // First try to get user ID from subscription metadata
  const userId = subscription.metadata?.user_id
  
  if (!userId) {
    console.error('❌ No user_id in subscription metadata')
    return
  }
  
  console.log('✅ Found user ID in metadata:', userId)
  
  try {
    // Extract subscription tier from metadata
    const planId = subscription.metadata?.plan_id || 'pro'
    console.log('📦 Plan ID:', planId)
    
    // Map Stripe statuses to our database constraint values
    const mapSubscriptionStatus = (stripeStatus: string) => {
      const statusMap: { [key: string]: string } = {
        'trialing': 'trial',        // Stripe uses 'trialing', we use 'trial'
        'active': 'active',
        'past_due': 'past_due', 
        'canceled': 'canceled',
        'cancelled': 'canceled',    // Handle both spellings
        'incomplete': 'past_due',   // Map incomplete to past_due
        'incomplete_expired': 'canceled',
        'unpaid': 'past_due'
      }
      
      return statusMap[stripeStatus] || 'active' // Default to active if unknown
    }

    const mappedStatus = mapSubscriptionStatus(subscription.status)
    console.log(`📊 Mapping Stripe status '${subscription.status}' to '${mappedStatus}'`)
    
    // Update user profile directly using the user ID
    const { error: profileError } = await supabase
      .from('user_profiles')
      .update({
        subscription_tier: planId,
        subscription_status: mappedStatus, // Use mapped status
        subscription_id: subscription.id,
        stripe_customer_id: subscription.customer as string,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (profileError) {
      console.error('❌ Error updating user profile:', profileError)
      throw profileError
    }

    console.log('✅ User profile updated successfully!')

    // Update usage limits based on plan (with promotional 20 free for new users)
    const planLimits = {
      free: { testCases: 20, apiCalls: 200 }, // Promotional: 20 instead of 10
      pro: { testCases: 500, apiCalls: 5000 },
      team: { testCases: 2000, apiCalls: 20000 },
      enterprise: { testCases: -1, apiCalls: -1 }
    }

    const limits = planLimits[planId as keyof typeof planLimits] || planLimits.pro

    const currentMonth = new Date().toISOString().slice(0, 7)
    console.log('📅 Current month:', currentMonth)
    console.log('📊 Updating usage with limits:', limits)
    
    // First, check if usage record exists
    const { data: existingUsage } = await supabase
      .from('user_usage')
      .select('*')
      .eq('user_id', userId)
      .eq('month', currentMonth)
      .single()

    console.log('🔍 Existing usage record:', existingUsage)

    // Prepare the upsert data, preserving current usage if it exists
    const upsertData = {
      user_id: userId,
      month: currentMonth,
      test_cases_generated: existingUsage?.test_cases_generated || 0, // Keep existing usage
      api_calls_used: existingUsage?.api_calls_used || 0,
      monthly_limit_test_cases: limits.testCases,
      monthly_limit_api_calls: limits.apiCalls,
      updated_at: new Date().toISOString()
    }

    console.log('💾 Upserting usage data:', upsertData)

    const { data: usageData, error: usageError } = await supabase
      .from('user_usage')
      .upsert(upsertData, {
        onConflict: 'user_id,month', // Specify conflict resolution
        ignoreDuplicates: false
      })
      .select()

    if (usageError) {
      console.error('❌ Error updating usage limits:', usageError)
      // Don't throw here, profile update was successful
    } else {
      console.log('✅ Usage limits updated successfully!')
      console.log('📈 Updated usage data:', usageData)
    }

    console.log(`🎉 User ${userId} successfully upgraded to ${planId}!`)

  } catch (error) {
    console.error('❌ Error in handleSubscriptionCreated:', error)
    throw error
  }
}