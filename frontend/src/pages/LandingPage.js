import React from 'react';
import Navbar from '../components/Navbar';
import Hero from '../components/Hero';
import Features from '../components/Features';
import HowItWorks from '../components/HowItWorks';
import Testimonials from '../components/Testimonials';
import RoleExplanation from '../components/RoleExplanation';
import Footer from '../components/Footer';
import '../styles/landing.css';

const LandingPage = () => {
  return (
    <div className="landing-page">
      <Navbar />
      <Hero />
      <Features />
      <HowItWorks />
      <Testimonials />
      <RoleExplanation />
      <Footer />
    </div>
  );
};

export default LandingPage;