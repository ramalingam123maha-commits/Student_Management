// Division.java
// A simple program to demonstrate division operations

public class Division {
    
    public static void main(String[] args) {
        // Example division operations
        int dividend = 100;
        int divisor = 5;
        
        // Integer division
        int result = dividend / divisor;
        System.out.println(dividend + " / " + divisor + " = " + result);
        
        // Division with floating point for decimal results
        double dividendDouble = 100.0;
        double divisorDouble = 5.0;
        double doubleResult = dividendDouble / divisorDouble;
        System.out.println(dividendDouble + " / " + divisorDouble + " = " + doubleResult);
        
        // Handling division by zero
        try {
            int zeroDivisor = 0;
            int zeroResult = dividend / zeroDivisor;
            System.out.println("This won't print");
        } catch (ArithmeticException e) {
            System.out.println("Error: Division by zero is not allowed!");
        }
    }
}
