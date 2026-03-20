import streamlit as st
import sqlite3
import pandas as pd

# Page Config - Platinum Aesthetics
st.set_page_config(page_title="Luxe Maurice Core", layout="wide")

st.markdown("""
    <style>
    .main { background-color: #0e1117; color: #ffffff; }
    .stMetric { background-color: #1c1f26; padding: 15px; border-radius: 10px; border: 1px solid #c0c0c0; }
    </style>
    """, unsafe_allow_html=True)

def get_data(query):
    conn = sqlite3.connect('luxe_core.db')
    df = pd.read_sql_query(query, conn)
    conn.close()
    return df

st.title("🏆 LUXE MAURICE | CORE INTELLIGENCE")
st.subheader("System Recovery: 100% | Source: SQLite Core")

# --- TOP STATS ---
col1, col2, col3 = st.columns(3)
with col1:
    client_count = get_data("SELECT COUNT(*) as count FROM clients")['count'][0]
    st.metric("Active Portals", client_count)
with col2:
    lead_count = get_data("SELECT COUNT(*) as count FROM leads")['count'][0]
    st.metric("Total Prospects", lead_count)
with col3:
    st.metric("Market Urgency", "HIGH", delta="July 1st Duty")

# --- CLIENT MANAGEMENT ---
st.divider()
st.header("🏢 Portal Management")
clients_df = get_data("SELECT id, name, status, redirect_url FROM clients")
st.dataframe(clients_df, use_container_width=True)

# --- LEAD INTELLIGENCE ---
st.divider()
st.header("💎 Verified High-Value Leads")
leads_df = get_data("SELECT timestamp, investment, credibility_score, status FROM leads ORDER BY credibility_score DESC")

# Color-coding logic for credibility
def highlight_credibility(val):
    color = 'red' if val < 50 else 'orange' if val < 80 else 'green'
    return f'color: {color}'

if not leads_df.empty:
    st.table(leads_df.style.applymap(highlight_credibility, subset=['credibility_score']))
else:
    st.info("No leads captured yet. Demo server is standing by.")

st.sidebar.title("Controls")
if st.sidebar.button("Refresh Data"):
    st.rerun()

st.sidebar.markdown("---")
st.sidebar.write("System: **Platinum Core v1.0**")
