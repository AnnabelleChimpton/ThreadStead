export const SIMPLE_DEFAULT_TEMPLATE = `<style>
/* Modern Minimal Styling */
body {
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%) !important;
  font-family: 'Inter', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif !important;
  line-height: 1.6 !important;
}

/* Custom container classes to avoid globals.css dependencies */
.template-container {
  width: 100% !important;
  padding: 2rem !important;
  margin: 0 auto !important;
  box-sizing: border-box !important;
}

.template-content-wrapper {
  max-width: 800px !important;
  margin: 0 auto !important;
  padding: 1.5rem !important;
  box-sizing: border-box !important;
}

.template-profile-header {
  max-width: 600px !important;
  margin: 0 auto !important;
  margin-bottom: 3rem !important;
  padding: 1.5rem !important;
  box-sizing: border-box !important;
}

.template-photo-container {
  text-align: center !important;
  margin-bottom: 1.5rem !important;
  padding: 1rem !important;
}

.template-bio-container {
  margin: 0 auto !important;
  margin-bottom: 3rem !important;
  padding: 1rem !important;
}

.template-social-container {
  margin: 0 auto !important;
  margin-bottom: 2rem !important;
  padding: 1rem !important;
  text-align: center !important;
}

.template-social-flex {
  display: flex !important;
  flex-direction: row !important;
  justify-content: center !important;
  align-items: center !important;
  gap: 1.5rem !important;
  flex-wrap: wrap !important;
}

.template-guestbook-container {
  margin: 0 auto !important;
  padding: 1rem !important;
}

.template-footer-container {
  margin: 0 auto !important;
  margin-top: 4rem !important;
  padding: 2rem !important;
  padding-top: 2rem !important;
  border-top: 1px solid rgba(0, 0, 0, 0.1) !important;
  text-align: center !important;
}

.ts-profile-display-name {
  font-size: 2.5rem !important;
  font-weight: 700 !important;
  color: #2d3748 !important;
  margin-bottom: 0.5rem !important;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  background-clip: text !important;
  -webkit-background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
}

.ts-profile-photo-frame {
  border-radius: 50% !important;
  box-shadow: 
    0 10px 25px rgba(0, 0, 0, 0.1),
    0 0 0 1px rgba(255, 255, 255, 0.8) !important;
  transition: all 0.3s ease !important;
}

.ts-profile-photo-frame:hover {
  transform: translateY(-2px) !important;
  box-shadow: 
    0 20px 40px rgba(0, 0, 0, 0.15),
    0 0 0 1px rgba(255, 255, 255, 0.9) !important;
}

.ts-profile-bio-section {
  background: rgba(255, 255, 255, 0.9) !important;
  border-radius: 16px !important;
  padding: 2rem !important;
  box-shadow: 
    0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  backdrop-filter: blur(10px) !important;
}

.ts-bio-text {
  color: #4a5568 !important;
  font-size: 1.1rem !important;
  text-align: center !important;
}

.ts-blog-posts {
  background: rgba(255, 255, 255, 0.95) !important;
  border-radius: 12px !important;
  overflow: hidden !important;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
  border: 1px solid rgba(255, 255, 255, 0.3) !important;
}

.ts-blog-posts-title {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
  color: white !important;
  font-weight: 600 !important;
  padding: 1rem 1.5rem !important;
  margin: 0 !important;
  font-size: 1.25rem !important;
}

.ts-blog-post {
  padding: 1.5rem !important;
  border-bottom: 1px solid rgba(0, 0, 0, 0.05) !important;
  transition: all 0.2s ease !important;
}

.ts-blog-post:hover {
  background: rgba(102, 126, 234, 0.05) !important;
  transform: translateX(4px) !important;
}

.ts-blog-post:last-child {
  border-bottom: none !important;
}

.ts-blog-post-meta {
  color: #718096 !important;
  font-size: 0.9rem !important;
  font-weight: 500 !important;
}

h1, h2, h3 {
  color: #2d3748 !important;
  font-weight: 600 !important;
}

h2 {
  font-size: 1.75rem !important;
  margin-bottom: 1.5rem !important;
  text-align: center !important;
}

h3 {
  font-size: 1.5rem !important;
  margin-bottom: 1rem !important;
}

a {
  color: #667eea !important;
  text-decoration: none !important;
  font-weight: 500 !important;
  transition: all 0.2s ease !important;
}

a:hover {
  color: #764ba2 !important;
  text-decoration: underline !important;
}

.content-card {
  background: rgba(255, 255, 255, 0.9) !important;
  border-radius: 12px !important;
  padding: 1.5rem !important;
  margin-bottom: 2rem !important;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1) !important;
  border: 1px solid rgba(255, 255, 255, 0.2) !important;
  backdrop-filter: blur(10px) !important;
}

.social-actions {
  display: flex !important;
  gap: 1rem !important;
  justify-content: center !important;
  align-items: center !important;
  margin-top: 2rem !important;
}

.welcome-message {
  text-align: center !important;
  color: #4a5568 !important;
  font-size: 1.1rem !important;
  padding: 2rem !important;
  background: rgba(255, 255, 255, 0.8) !important;
  border-radius: 12px !important;
  border: 1px solid rgba(255, 255, 255, 0.3) !important;
  backdrop-filter: blur(10px) !important;
}

.guestbook-section {
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%) !important;
  border-radius: 12px !important;
  padding: 1.5rem !important;
  margin-top: 2rem !important;
  border: 1px solid rgba(102, 126, 234, 0.2) !important;
}

.welcome-subtitle {
  color: #718096 !important;
  font-size: 1.1rem !important;
  margin-top: 0.5rem !important;
}

.main-content {
  margin-bottom: 3rem !important;
}

.welcome-title {
  color: #667eea !important;
  margin-bottom: 1rem !important;
}

.guestbook-title {
  text-align: center !important;
  color: #667eea !important;
  margin-bottom: 1rem !important;
}

.guestbook-subtitle {
  text-align: center !important;
  color: #718096 !important;
  margin-bottom: 1.5rem !important;
  font-size: 0.95rem !important;
}

.footer-section {
  margin-top: 4rem !important;
  padding-top: 2rem !important;
  border-top: 1px solid rgba(0, 0, 0, 0.1) !important;
}

.footer-text {
  color: #a0aec0 !important;
  font-size: 0.9rem !important;
}
</style>

<div class="template-container">
  
  <div class="template-profile-header">
    <div class="template-photo-container">
      <ProfilePhoto size="xl" shape="circle" />
    </div>
    <DisplayName as="h1" />
    <div class="welcome-subtitle">
      Welcome to my space on the web
    </div>
  </div>
  
  <div class="template-bio-container">
    <Bio />
  </div>
  
  <div class="main-content">
    <Choose>
      <When data="posts">
        <h2>Recent Posts</h2>
        <BlogPosts limit="5" />
      </When>
      <Otherwise>
        <div class="welcome-message">
          <IfOwner>
            <h3 class="welcome-title">Welcome to your new profile!</h3>
            <p>Start by adding some posts or customizing your page to make it uniquely yours.</p>
          </IfOwner>
          <IfVisitor>
            <h3 class="welcome-title">This profile is just getting started</h3>
            <p>Check back soon for updates and new content!</p>
          </IfVisitor>
        </div>
      </Otherwise>
    </Choose>
  </div>
  
  <IfVisitor>
    <div class="template-social-container">
      <div class="template-social-flex">
        <FollowButton />
        <MutualFriends />
      </div>
    </div>
    
    <div class="guestbook-section">
      <div class="template-guestbook-container">
        <h3 class="guestbook-title">Leave a Message</h3>
        <div class="guestbook-subtitle">
          Share your thoughts or just say hello!
        </div>
        <Guestbook />
      </div>
    </div>
  </IfVisitor>
  
  <div class="template-footer-container">
    <div class="footer-text">
      Powered by <SiteBranding />
    </div>
  </div>

</div>`;