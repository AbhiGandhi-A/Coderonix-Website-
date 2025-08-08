// import React from 'react';
// import { Link } from 'react-router-dom';

// const LandingPage = () => {
//   return (
//     <div className="landing-page">
//       <header className="landing-header">
//         <div className="container">
//           <div className="logo">
//             <h1>Codronix</h1>
//           </div>
//           <nav className="nav-links">
//             <Link to="/login" className="btn-link">Login</Link>
//             <Link to="/register" className="btn-primary">Get Started</Link>
//           </nav>
//         </div>
//       </header>

//       <main className="landing-main">
//         <section className="hero">
//           <div className="container">
//             <div className="hero-content">
//               <h1>Collaborate. Organize. Succeed.</h1>
//               <p>The ultimate platform for team collaboration and task management. Create groups, assign tasks, and communicate in real-time.</p>
//               <div className="hero-buttons">
//                 <Link to="/register" className="btn-primary btn-large">Start Collaborating</Link>
//                 <Link to="/login" className="btn-secondary btn-large">Sign In</Link>
//               </div>
//             </div>
//           </div>
//         </section>

//         <section className="features">
//           <div className="container">
//             <h2>Powerful Features</h2>
//             <div className="features-grid">
//               <div className="feature-card">
//                 <div className="feature-icon">📋</div>
//                 <h3>Task Management</h3>
//                 <p>Create, assign, and track tasks with deadlines and progress monitoring.</p>
//               </div>
//               <div className="feature-card">
//                 <div className="feature-icon">💬</div>
//                 <h3>Real-time Chat</h3>
//                 <p>Communicate instantly with your team members and share updates.</p>
//               </div>
//               <div className="feature-card">
//                 <div className="feature-icon">📁</div>
//                 <h3>File Sharing</h3>
//                 <p>Upload and share files securely with team members.</p>
//               </div>
//               <div className="feature-card">
//                 <div className="feature-icon">👥</div>
//                 <h3>Group Management</h3>
//                 <p>Easily manage team members and assign different roles.</p>
//               </div>
//             </div>
//           </div>
//         </section>
//       </main>

//       <footer className="landing-footer">
//         <div className="container">
//           <p>&copy; 2024 Codronix. All rights reserved.</p>
//         </div>
//       </footer>
//     </div>
//   );
// };

// export default LandingPage;

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Code2, Users, MessageSquare, Calendar, FileText, BarChart3, CheckCircle, Star, ArrowRight, Github, Twitter, Linkedin, Mail, Play, Zap, Shield, Globe, Smartphone } from 'lucide-react';
import '../styles/LandingPage.css'; // We'll create this CSS file

const LandingPage = () => {
  const [isVisible, setIsVisible] = useState({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(prev => ({
              ...prev,
              [entry.target.id]: true
            }));
          }
        });
      },
      { threshold: 0.1 }
    );

    document.querySelectorAll('[id]').forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const features = [
    {
      icon: <Code2 size={24} />,
      title: "Real-time Code Editor",
      description: "Collaborate on code with your team in real-time with syntax highlighting and live cursors."
    },
    {
      icon: <Users size={24} />,
      title: "Team Management",
      description: "Organize your development team with role-based access and member management."
    },
    {
      icon: <MessageSquare size={24} />,
      title: "Instant Chat",
      description: "Stay connected with built-in chat functionality and real-time notifications."
    },
    {
      icon: <Calendar size={24} />,
      title: "Project Calendar",
      description: "Schedule meetings, deadlines, and track project milestones in one place."
    },
    {
      icon: <FileText size={24} />,
      title: "File Management",
      description: "Share files, manage project assets, and keep everything organized."
    },
    {
      icon: <BarChart3 size={24} />,
      title: "Analytics Dashboard",
      description: "Track team productivity and project progress with detailed analytics."
    }
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Computer Science Student",
      university: "Stanford University",
      content: "Codronix has revolutionized how our study group collaborates on coding projects. The real-time editor is a game-changer!",
      rating: 5
    },
    {
      name: "Marcus Johnson",
      role: "Full-Stack Developer",
      university: "Bootcamp Graduate",
      content: "Perfect for remote pair programming sessions. The integrated chat and file sharing make everything seamless.",
      rating: 5
    },
    {
      name: "Elena Rodriguez",
      role: "CS Teaching Assistant",
      university: "MIT",
      content: "I use Codronix to help students with their assignments. The team management features are incredibly useful.",
      rating: 5
    }
  ];

  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="navbar">
        <div className="container">
          <div className="nav-brand">
            <Code2 size={32} className="brand-icon" />
            <span className="brand-text">Codronix</span>
          </div>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#testimonials">Reviews</a>
            <Link to="/pricing">Pricing</Link>
            <Link to="/login" className="btn-secondary">Sign In</Link>
            <Link to="/register" className="btn-primary">Get Started</Link>
          </div>
          <div className="mobile-menu-toggle">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero" id="hero">
        <div className="container">
          <div className="hero-content">
            <div className="hero-text">
              <h1 className={`hero-title ${isVisible.hero ? 'animate-in' : ''}`}>
                Code Together, 
                <span className="gradient-text"> Build Better</span>
              </h1>
              <p className={`hero-subtitle ${isVisible.hero ? 'animate-in delay-1' : ''}`}>
                The ultimate collaboration platform for developers and students. 
                Real-time coding, team management, and project tracking - all in one place.
              </p>
              <div className={`hero-actions ${isVisible.hero ? 'animate-in delay-2' : ''}`}>
                <Link to="/register" className="btn-primary btn-large">
                  Start Free Trial
                  <ArrowRight size={20} />
                </Link>
                <button className="btn-secondary btn-large">
                  <Play size={20} />
                  Watch Demo
                </button>
              </div>
              <div className={`hero-stats ${isVisible.hero ? 'animate-in delay-3' : ''}`}>
                <div className="stat">
                  <span className="stat-number">10K+</span>
                  <span className="stat-label">Active Users</span>
                </div>
                <div className="stat">
                  <span className="stat-number">500+</span>
                  <span className="stat-label">Teams</span>
                </div>
                <div className="stat">
                  <span className="stat-number">50+</span>
                  <span className="stat-label">Universities</span>
                </div>
              </div>
            </div>
            <div className="hero-visual">
              <div className="hero-image">
                <div className="code-window">
                  <div className="window-header">
                    <div className="window-controls">
                      <span className="control red"></span>
                      <span className="control yellow"></span>
                      <span className="control green"></span>
                    </div>
                    <span className="window-title">main.js</span>
                  </div>
                  <div className="code-content">
                    <div className="code-line">
                      <span className="line-number">1</span>
                      <span className="code-text">
                        <span className="keyword">function</span> 
                        <span className="function"> collaborate</span>
                        <span className="punctuation">(</span>
                        <span className="parameter">team</span>
                        <span className="punctuation">) {'{'}</span>
                      </span>
                    </div>
                    <div className="code-line">
                      <span className="line-number">2</span>
                      <span className="code-text">
                        <span className="keyword">  return</span> 
                        <span className="string"> {'\'amazing results\''}</span>
                        <span className="punctuation">;</span>
                      </span>
                    </div>
                    <div className="code-line">
                      <span className="line-number">3</span>
                      <span className="code-text">
                        <span className="punctuation">{'}'}</span>
                      </span>
                    </div>
                  </div>
                </div>
                <div className="floating-elements">
                  <div className="floating-card chat-card">
                    <MessageSquare size={16} />
                    <span>New message from Sarah</span>
                  </div>
                  <div className="floating-card user-card">
                    <Users size={16} />
                    <span>3 users online</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features" id="features">
        <div className="container">
          <div className="section-header">
            <h2 className={`section-title ${isVisible.features ? 'animate-in' : ''}`}>
              Everything you need to collaborate
            </h2>
            <p className={`section-subtitle ${isVisible.features ? 'animate-in delay-1' : ''}`}>
              Powerful tools designed for modern development teams
            </p>
          </div>
          <div className="features-grid">
            {features.map((feature, index) => (
              <div 
                key={index} 
                className={`feature-card ${isVisible.features ? 'animate-in' : ''}`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="feature-icon">
                  {feature.icon}
                </div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-description">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="benefits" id="benefits">
        <div className="container">
          <div className="benefits-content">
            <div className="benefits-text">
              <h2 className={`section-title ${isVisible.benefits ? 'animate-in' : ''}`}>
                Why developers choose Codronix
              </h2>
              <div className="benefits-list">
                <div className={`benefit-item ${isVisible.benefits ? 'animate-in delay-1' : ''}`}>
                  <CheckCircle size={20} className="benefit-icon" />
                  <div>
                    <h4>Lightning Fast</h4>
                    <p>Real-time synchronization with sub-100ms latency</p>
                  </div>
                </div>
                <div className={`benefit-item ${isVisible.benefits ? 'animate-in delay-2' : ''}`}>
                  <Shield size={20} className="benefit-icon" />
                  <div>
                    <h4>Secure & Private</h4>
                    <p>End-to-end encryption for all your code and communications</p>
                  </div>
                </div>
                <div className={`benefit-item ${isVisible.benefits ? 'animate-in delay-3' : ''}`}>
                  <Globe size={20} className="benefit-icon" />
                  <div>
                    <h4>Works Everywhere</h4>
                    <p>Access from any device, anywhere in the world</p>
                  </div>
                </div>
                <div className={`benefit-item ${isVisible.benefits ? 'animate-in delay-4' : ''}`}>
                  <Zap size={20} className="benefit-icon" />
                  <div>
                    <h4>Boost Productivity</h4>
                    <p>Integrated tools that eliminate context switching</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="benefits-visual">
              <div className="dashboard-preview">
                <div className="preview-header">
                  <div className="preview-tabs">
                    <span className="tab active">Dashboard</span>
                    <span className="tab">Code Editor</span>
                    <span className="tab">Chat</span>
                  </div>
                </div>
                <div className="preview-content">
                  <div className="preview-sidebar">
                    <div className="sidebar-item active">
                      <Code2 size={16} />
                      <span>Projects</span>
                    </div>
                    <div className="sidebar-item">
                      <Users size={16} />
                      <span>Team</span>
                    </div>
                    <div className="sidebar-item">
                      <MessageSquare size={16} />
                      <span>Chat</span>
                    </div>
                  </div>
                  <div className="preview-main">
                    <div className="preview-cards">
                      <div className="preview-card">
                        <div className="card-header">Active Projects</div>
                        <div className="card-content">
                          <div className="progress-bar">
                            <div className="progress-fill" style={{width: '75%'}}></div>
                          </div>
                        </div>
                      </div>
                      <div className="preview-card">
                        <div className="card-header">Team Activity</div>
                        <div className="card-content">
                          <div className="activity-item">
                            <div className="activity-dot"></div>
                            <span>Sarah pushed new code</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="testimonials" id="testimonials">
        <div className="container">
          <div className="section-header">
            <h2 className={`section-title ${isVisible.testimonials ? 'animate-in' : ''}`}>
              Loved by developers worldwide
            </h2>
            <p className={`section-subtitle ${isVisible.testimonials ? 'animate-in delay-1' : ''}`}>
              See what our users have to say about Codronix
            </p>
          </div>
          <div className="testimonials-grid">
            {testimonials.map((testimonial, index) => (
              <div 
                key={index} 
                className={`testimonial-card ${isVisible.testimonials ? 'animate-in' : ''}`}
                style={{ animationDelay: `${index * 0.2}s` }}
              >
                <div className="testimonial-rating">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} size={16} className="star-filled" />
                  ))}
                </div>
                <p className="testimonial-content">"{testimonial.content}"</p>
                <div className="testimonial-author">
                  <div className="author-info">
                    <h4 className="author-name">{testimonial.name}</h4>
                    <p className="author-role">{testimonial.role}</p>
                    <p className="author-university">{testimonial.university}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta" id="cta">
        <div className="container">
          <div className="cta-content">
            <h2 className={`cta-title ${isVisible.cta ? 'animate-in' : ''}`}>
              Ready to transform your development workflow?
            </h2>
            <p className={`cta-subtitle ${isVisible.cta ? 'animate-in delay-1' : ''}`}>
              Join thousands of developers who are already collaborating better with Codronix
            </p>
            <div className={`cta-actions ${isVisible.cta ? 'animate-in delay-2' : ''}`}>
              <Link to="/register" className="btn-primary btn-large">
                Start Your Free Trial
                <ArrowRight size={20} />
              </Link>
              <a 
                href="https://forms.google.com/your-form-id" 
                target="_blank" 
                rel="noopener noreferrer"
                className="btn-secondary btn-large"
              >
                Join Beta Testing
              </a>
            </div>
            <p className={`cta-note ${isVisible.cta ? 'animate-in delay-3' : ''}`}>
              No credit card required • 14-day free trial • Cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-brand">
              <div className="brand">
                <Code2 size={32} className="brand-icon" />
                <span className="brand-text">Codronix</span>
              </div>
              <p className="brand-description">
                The ultimate collaboration platform for developers and students.
              </p>
              <div className="social-links">
                <a href="#" aria-label="GitHub">
                  <Github size={20} />
                </a>
                <a href="#" aria-label="Twitter">
                  <Twitter size={20} />
                </a>
                <a href="#" aria-label="LinkedIn">
                  <Linkedin size={20} />
                </a>
                <a href="mailto:hello@codronix.com" aria-label="Email">
                  <Mail size={20} />
                </a>
              </div>
            </div>
            <div className="footer-links">
              <div className="footer-column">
                <h4>Product</h4>
                <ul>
                  <li><a href="#features">Features</a></li>
                  <li><Link to="/pricing">Pricing</Link></li>
                  <li><a href="#testimonials">Reviews</a></li>
                  <li><a href="#">Roadmap</a></li>
                </ul>
              </div>
              <div className="footer-column">
                <h4>Company</h4>
                <ul>
                  <li><a href="#">About</a></li>
                  <li><a href="#">Blog</a></li>
                  <li><a href="#">Careers</a></li>
                  <li><a href="#">Contact</a></li>
                </ul>
              </div>
              <div className="footer-column">
                <h4>Resources</h4>
                <ul>
                  <li><a href="#">Documentation</a></li>
                  <li><a href="#">Help Center</a></li>
                  <li><a href="#">Community</a></li>
                  <li><a href="#">Status</a></li>
                </ul>
              </div>
              <div className="footer-column">
                <h4>Legal</h4>
                <ul>
                  <li><a href="#">Privacy Policy</a></li>
                  <li><a href="#">Terms of Service</a></li>
                  <li><a href="#">Cookie Policy</a></li>
                  <li><a href="#">GDPR</a></li>
                </ul>
              </div>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2024 Codronix. All rights reserved.</p>
            <p>Made with ❤️ for developers everywhere</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
