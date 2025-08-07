import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage = () => {
  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="container">
          <div className="logo">
            <h1>Codronix</h1>
          </div>
          <nav className="nav-links">
            <Link to="/login" className="btn-link">Login</Link>
            <Link to="/register" className="btn-primary">Get Started</Link>
          </nav>
        </div>
      </header>

      <main className="landing-main">
        <section className="hero">
          <div className="container">
            <div className="hero-content">
              <h1>Collaborate. Organize. Succeed.</h1>
              <p>The ultimate platform for team collaboration and task management. Create groups, assign tasks, and communicate in real-time.</p>
              <div className="hero-buttons">
                <Link to="/register" className="btn-primary btn-large">Start Collaborating</Link>
                <Link to="/login" className="btn-secondary btn-large">Sign In</Link>
              </div>
            </div>
          </div>
        </section>

        <section className="features">
          <div className="container">
            <h2>Powerful Features</h2>
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">📋</div>
                <h3>Task Management</h3>
                <p>Create, assign, and track tasks with deadlines and progress monitoring.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">💬</div>
                <h3>Real-time Chat</h3>
                <p>Communicate instantly with your team members and share updates.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">📁</div>
                <h3>File Sharing</h3>
                <p>Upload and share files securely with team members.</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">👥</div>
                <h3>Group Management</h3>
                <p>Easily manage team members and assign different roles.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="landing-footer">
        <div className="container">
          <p>&copy; 2024 Codronix. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;