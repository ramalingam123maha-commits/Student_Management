import java.util.Scanner;
import java.util.regex.Pattern;

/**
 * Login class for user authentication in Student Management System
 */
public class Login {
    private String username;
    private String password;
    private static final int MIN_PASSWORD_LENGTH = 6;
    private static final Pattern EMAIL_PATTERN = 
        Pattern.compile("^[A-Za-z0-9+_.-]+@(.+)$");

    /**
     * Constructor for Login class
     */
    public Login() {
        this.username = "";
        this.password = "";
    }

    /**
     * Constructor with username and password
     * @param username The username for login
     * @param password The password for login
     */
    public Login(String username, String password) {
        this.username = username;
        this.password = password;
    }

    /**
     * Validates the username format
     * @param username The username to validate
     * @return true if username is valid, false otherwise
     */
    public boolean isValidUsername(String username) {
        if (username == null || username.trim().isEmpty()) {
            System.out.println("Error: Username cannot be empty.");
            return false;
        }
        if (username.length() < 3) {
            System.out.println("Error: Username must be at least 3 characters long.");
            return false;
        }
        return true;
    }

    /**
     * Validates the password format
     * @param password The password to validate
     * @return true if password is valid, false otherwise
     */
    public boolean isValidPassword(String password) {
        if (password == null || password.trim().isEmpty()) {
            System.out.println("Error: Password cannot be empty.");
            return false;
        }
        if (password.length() < MIN_PASSWORD_LENGTH) {
            System.out.println("Error: Password must be at least " + MIN_PASSWORD_LENGTH + " characters long.");
            return false;
        }
        return true;
    }

    /**
     * Authenticates the user based on username and password
     * @param username The username to authenticate
     * @param password The password to authenticate
     * @return true if authentication is successful, false otherwise
     */
    public boolean authenticate(String username, String password) {
        if (!isValidUsername(username)) {
            return false;
        }
        if (!isValidPassword(password)) {
            return false;
        }
        
        // Here you would typically check against a database
        // This is a placeholder implementation
        this.username = username;
        this.password = password;
        
        System.out.println("Login successful for user: " + username);
        return true;
    }

    /**
     * Interactive login method that prompts user for credentials
     * @return true if login is successful, false otherwise
     */
    public boolean interactiveLogin() {
        Scanner scanner = new Scanner(System.in);
        
        System.out.println("=== Student Management System - Login ===");
        System.out.print("Enter username: ");
        String inputUsername = scanner.nextLine();
        
        System.out.print("Enter password: ");
        String inputPassword = scanner.nextLine();
        
        boolean success = authenticate(inputUsername, inputPassword);
        scanner.close();
        return success;
    }

    /**
     * Gets the current username
     * @return The username
     */
    public String getUsername() {
        return username;
    }

    /**
     * Sets the username
     * @param username The username to set
     */
    public void setUsername(String username) {
        this.username = username;
    }

    /**
     * Gets the current password (note: normally passwords should not be exposed)
     * @return The password
     */
    public String getPassword() {
        return password;
    }

    /**
     * Sets the password
     * @param password The password to set
     */
    public void setPassword(String password) {
        this.password = password;
    }

    /**
     * Main method for testing the Login class
     * @param args Command line arguments
     */
    public static void main(String[] args) {
        // Example 1: Direct authentication
        Login login1 = new Login();
        boolean result1 = login1.authenticate("student123", "password123");
        System.out.println("Direct authentication result: " + result1);
        
        System.out.println("\n---\n");
        
        // Example 2: Interactive login
        Login login2 = new Login();
        boolean result2 = login2.interactiveLogin();
        System.out.println("Interactive login result: " + result2);
    }
}
