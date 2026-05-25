import java.util.HashMap;
import java.util.Map;
import java.util.Scanner;

/**
 * Login class for Student Management System
 * Handles user authentication with username and password validation
 */
public class Login {
    
    // Sample user database (in production, this would connect to a real database)
    private static final Map<String, String> userDatabase = new HashMap<>();
    
    // Static block to initialize sample users
    static {
        userDatabase.put("admin", "admin123");
        userDatabase.put("student1", "pass123");
        userDatabase.put("teacher1", "teach123");
    }
    
    private String username;
    private String password;
    private boolean isAuthenticated;
    private String userRole;
    
    /**
     * Constructor for Login class
     */
    public Login() {
        this.isAuthenticated = false;
        this.userRole = null;
    }
    
    /**
     * Constructor with username and password
     * @param username the username
     * @param password the password
     */
    public Login(String username, String password) {
        this.username = username;
        this.password = password;
        this.isAuthenticated = false;
        this.userRole = null;
    }
    
    /**
     * Authenticate user based on credentials
     * @return true if authentication successful, false otherwise
     */
    public boolean authenticate() {
        if (username == null || username.trim().isEmpty()) {
            System.out.println("Error: Username cannot be empty");
            return false;
        }
        
        if (password == null || password.trim().isEmpty()) {
            System.out.println("Error: Password cannot be empty");
            return false;
        }
        
        if (userDatabase.containsKey(username)) {
            if (userDatabase.get(username).equals(password)) {
                this.isAuthenticated = true;
                this.userRole = determineRole(username);
                System.out.println("✓ Authentication successful!");
                System.out.println("Welcome, " + username + " (" + userRole + ")");
                return true;
            } else {
                System.out.println("✗ Authentication failed: Incorrect password");
                return false;
            }
        } else {
            System.out.println("✗ Authentication failed: User not found");
            return false;
        }
    }
    
    /**
     * Determine user role based on username
     * @param username the username
     * @return the user role
     */
    private String determineRole(String username) {
        if (username.equals("admin")) {
            return "Administrator";
        } else if (username.startsWith("student")) {
            return "Student";
        } else if (username.startsWith("teacher")) {
            return "Teacher";
        }
        return "User";
    }
    
    /**
     * Get authentication status
     * @return true if user is authenticated, false otherwise
     */
    public boolean isAuthenticated() {
        return isAuthenticated;
    }
    
    /**
     * Get user role
     * @return the user role
     */
    public String getUserRole() {
        return userRole;
    }
    
    /**
     * Get username
     * @return the username
     */
    public String getUsername() {
        return username;
    }
    
    /**
     * Set username
     * @param username the username to set
     */
    public void setUsername(String username) {
        this.username = username;
    }
    
    /**
     * Set password
     * @param password the password to set
     */
    public void setPassword(String password) {
        this.password = password;
    }
    
    /**
     * Register a new user (for demonstration purposes)
     * @param username the new username
     * @param password the new password
     * @return true if registration successful, false if user already exists
     */
    public static boolean registerUser(String username, String password) {
        if (userDatabase.containsKey(username)) {
            System.out.println("✗ Registration failed: User already exists");
            return false;
        }
        
        if (username == null || username.trim().isEmpty() || 
            password == null || password.trim().isEmpty()) {
            System.out.println("✗ Registration failed: Username and password cannot be empty");
            return false;
        }
        
        userDatabase.put(username, password);
        System.out.println("✓ User registered successfully: " + username);
        return true;
    }
    
    /**
     * Interactive login from console
     * @return true if authentication successful, false otherwise
     */
    public static boolean interactiveLogin() {
        Scanner scanner = new Scanner(System.in);
        
        System.out.println("\n========== Student Management System - Login ==========");
        System.out.print("Enter username: ");
        String username = scanner.nextLine().trim();
        
        System.out.print("Enter password: ");
        String password = scanner.nextLine();
        
        Login login = new Login(username, password);
        return login.authenticate();
    }
    
    /**
     * Display available demo credentials
     */
    public static void displayDemoCredentials() {
        System.out.println("\n========== Demo Credentials ==========");
        System.out.println("Username: admin       | Password: admin123");
        System.out.println("Username: student1    | Password: pass123");
        System.out.println("Username: teacher1    | Password: teach123");
        System.out.println("=====================================\n");
    }
    
    /**
     * Main method for testing
     */
    public static void main(String[] args) {
        displayDemoCredentials();
        
        if (interactiveLogin()) {
            System.out.println("\n✓ Access granted to Student Management System");
        } else {
            System.out.println("\n✗ Access denied. Please try again.");
        }
    }
}
